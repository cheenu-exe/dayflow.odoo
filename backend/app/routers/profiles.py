from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import get_admin_user, get_current_user
from app.models import EmployeeProfile, Team, User
from app.schemas import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])


def serialize_profile(profile: EmployeeProfile) -> ProfileResponse:
    return ProfileResponse.model_validate(profile)


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfileResponse:
    profile = db.scalar(select(EmployeeProfile).options(joinedload(EmployeeProfile.team)).where(EmployeeProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return serialize_profile(profile)


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfileResponse:
    profile = db.scalar(select(EmployeeProfile).options(joinedload(EmployeeProfile.team)).where(EmployeeProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    changes = payload.model_dump(exclude_unset=True)
    if "team_id" in changes:
        if current_user.role not in {"ADMIN", "HR_ADMIN"}:
            raise HTTPException(status_code=403, detail="Only administrators can change team assignments")
        team = db.scalar(select(Team).where(Team.id == changes["team_id"], Team.organization_id == current_user.organization_id))
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
    for field, value in changes.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return serialize_profile(profile)


@router.get("", response_model=list[ProfileResponse])
def list_profiles(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    search: str | None = None,
    team_id: str | None = None,
) -> list[ProfileResponse]:
    query = (
        select(EmployeeProfile)
        .join(EmployeeProfile.user)
        .options(joinedload(EmployeeProfile.team))
        .where(User.organization_id == admin.organization_id)
        .order_by(EmployeeProfile.full_name)
    )
    if team_id:
        query = query.where(EmployeeProfile.team_id == team_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            (EmployeeProfile.full_name.ilike(pattern))
            | (EmployeeProfile.job_title.ilike(pattern))
            | (User.email.ilike(pattern))
        )
    profiles = db.scalars(query).all()
    return [serialize_profile(profile) for profile in profiles]



@router.patch("/{user_id}", response_model=ProfileResponse)
def admin_update_profile(
    user_id: str,
    payload: ProfileUpdate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfileResponse:
    profile = db.scalar(
        select(EmployeeProfile)
        .join(EmployeeProfile.user)
        .options(joinedload(EmployeeProfile.team))
        .where(EmployeeProfile.user_id == user_id, User.organization_id == admin.organization_id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    changes = payload.model_dump(exclude_unset=True)
    if "team_id" in changes:
        team = db.scalar(select(Team).where(Team.id == changes["team_id"], Team.organization_id == admin.organization_id))
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
    for field, value in changes.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return serialize_profile(profile)


class OnboardEmployeePayload(ProfileUpdate):
    email: str
    password: str = "Employee@1234"
    full_name: str
    job_title: str
    team_id: str | None = None
    join_date: str | None = None
    basic_monthly: float = 50000.0
    housing_monthly: float = 10000.0
    transport_monthly: float = 5000.0


@router.post("/onboard", response_model=ProfileResponse, status_code=201)
def onboard_employee(
    payload: OnboardEmployeePayload,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfileResponse:
    from datetime import date
    from decimal import Decimal
    from app.security import hash_password
    from app.models import SalaryStructure, LeaveBalance, LeaveType

    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    team = None
    if payload.team_id:
        team = db.scalar(select(Team).where(Team.id == payload.team_id, Team.organization_id == admin.organization_id))
    if not team:
        team = db.scalar(select(Team).where(Team.organization_id == admin.organization_id).order_by(Team.name))
    if not team:
        team = Team(organization_id=admin.organization_id, name="General")
        db.add(team)
        db.flush()

    new_user = User(
        organization_id=admin.organization_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="EMPLOYEE",
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    join_d = date.today()
    if payload.join_date:
        try:
            join_d = date.fromisoformat(payload.join_date)
        except Exception:
            pass

    prof = EmployeeProfile(
        user_id=new_user.id,
        team_id=team.id,
        full_name=payload.full_name,
        job_title=payload.job_title,
        join_date=join_d,
        timezone=payload.timezone or "America/New_York",
        phone=payload.phone,
    )
    db.add(prof)
    db.flush()

    # Initial Salary Structure
    sal = SalaryStructure(
        employee_id=prof.id,
        effective_from=join_d,
        basic_monthly=Decimal(str(payload.basic_monthly)),
        housing_monthly=Decimal(str(payload.housing_monthly)),
        transport_monthly=Decimal(str(payload.transport_monthly)),
    )
    db.add(sal)

    # Allocate initial leave balances for all org leave types
    org_leave_types = db.scalars(select(LeaveType).where(LeaveType.organization_id == admin.organization_id)).all()
    current_yr = date.today().year
    for lt in org_leave_types:
        db.add(LeaveBalance(employee_id=prof.id, leave_type_id=lt.id, year=current_yr, entitled=lt.annual_days, used=Decimal("0.00")))

    db.commit()
    db.refresh(prof)
    return serialize_profile(prof)


@router.delete("/{user_id}", status_code=204)
def admin_delete_employee(
    user_id: str,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    user = db.scalar(select(User).where(User.id == user_id, User.organization_id == admin.organization_id))
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(user)
    db.commit()
    return None

