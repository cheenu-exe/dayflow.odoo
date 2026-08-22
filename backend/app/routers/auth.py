from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import EmployeeProfile, LeaveBalance, LeaveType, Organization, Team, User
from app.schemas import LoginRequest, LoginResponse, RegisterRequest, UserSummary
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=LoginResponse, status_code=201)
def register(payload: RegisterRequest, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email is already registered")
    organization = Organization(name=payload.organization_name)
    team = Team(name="General", organization=organization)
    user = User(email=email, password_hash=hash_password(payload.password), role="HR_ADMIN", organization=organization)
    profile = EmployeeProfile(user=user, team=team, full_name=payload.full_name, job_title="Administrator", join_date=date.today(), timezone=payload.timezone)
    leave_type = LeaveType(name="Annual", annual_days=20, organization=organization)
    db.add_all([organization, team, user, profile, leave_type])
    db.flush()
    db.add(LeaveBalance(employee=profile, leave_type=leave_type, year=date.today().year, entitled=leave_type.annual_days, used=0))
    db.commit()
    db.refresh(user)
    token, expires_in = create_access_token(user.id, user.role)
    return LoginResponse(access_token=token, expires_in=expires_in, user=UserSummary.model_validate(user))


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token, expires_in = create_access_token(user.id, user.role)
    return LoginResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserSummary.model_validate(user),
    )


@router.get("/me", response_model=UserSummary)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserSummary:
    return UserSummary.model_validate(current_user)
