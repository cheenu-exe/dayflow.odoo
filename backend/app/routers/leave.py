from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import get_admin_user, get_current_user
from app.models import EmployeeProfile, LeaveApprovalEvent, LeaveBalance, LeaveRequest, LeaveType, Team, User
from app.schemas import CoverageRisk, LeaveBalanceCreate, LeaveBalanceResponse, LeaveDecision, LeaveRequestCreate, LeaveRequestResponse, LeaveTypeCreate, LeaveTypeResponse

router = APIRouter(prefix="/leave", tags=["leave"])


@router.get("/types", response_model=list[LeaveTypeResponse])
def list_leave_types(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[LeaveTypeResponse]:
    types = db.scalars(
        select(LeaveType).where(LeaveType.organization_id == current_user.organization_id).order_by(LeaveType.name)
    ).all()
    return types


@router.post("/types", response_model=LeaveTypeResponse, status_code=201)
def create_leave_type(
    payload: LeaveTypeCreate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LeaveTypeResponse:
    leave_type = LeaveType(
        organization_id=admin.organization_id,
        name=payload.name,
        annual_days=payload.annual_days,
    )
    db.add(leave_type)
    db.commit()
    db.refresh(leave_type)
    return leave_type


@router.delete("/types/{type_id}", status_code=204)
def delete_leave_type(
    type_id: str,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    leave_type = db.scalar(select(LeaveType).where(LeaveType.id == type_id, LeaveType.organization_id == admin.organization_id))
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    db.delete(leave_type)
    db.commit()
    return None



@router.post("/balances", response_model=LeaveBalanceResponse, status_code=201)
def create_leave_balance(
    payload: LeaveBalanceCreate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LeaveBalanceResponse:
    employee = db.scalar(
        select(EmployeeProfile)
        .join(EmployeeProfile.user)
        .where(EmployeeProfile.id == payload.employee_id, User.organization_id == admin.organization_id)
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    balance = LeaveBalance(
        employee_id=payload.employee_id,
        leave_type_id=payload.leave_type_id,
        year=payload.year,
        entitled=payload.entitled,
        used=Decimal("0.00"),
    )
    db.add(balance)
    db.commit()
    db.refresh(balance)
    return LeaveBalanceResponse.model_validate(balance).model_copy(update={"remaining": balance.remaining})

from app.services.events import DomainEvent, publish_event
from app.services.ml_contract import calculate_coverage_risk, date_range


def _days(start: date, end: date) -> Decimal:
    return Decimal((end - start).days + 1)


def _coverage(db: Session, employee: EmployeeProfile, start: date, end: date) -> CoverageRisk:
    team_size = db.scalar(select(func.count(EmployeeProfile.id)).where(EmployeeProfile.team_id == employee.team_id)) or 0
    affected = date_range(start, end)
    counts: list[int] = []
    for day in affected:
        overlapping = db.scalar(
            select(func.count(func.distinct(LeaveRequest.employee_id)))
            .join(LeaveRequest.employee)
            .where(
                EmployeeProfile.team_id == employee.team_id,
                LeaveRequest.status == "APPROVED",
                LeaveRequest.start_date <= day,
                LeaveRequest.end_date >= day,
            )
        ) or 0
        counts.append(int(overlapping) + 1)  # Include the request currently being evaluated.
    result = calculate_coverage_risk(team_size, counts, affected)
    return CoverageRisk(
        level=result.level,
        staffing_ratio=result.staffing_ratio,
        team_size=result.team_size,
        affected_dates=result.affected_dates,
        message=result.message,
    )


def _serialize(request: LeaveRequest, risk: CoverageRisk | None = None) -> LeaveRequestResponse:
    return LeaveRequestResponse.model_validate(request).model_copy(update={"coverage_risk": risk})


@router.post("/requests", response_model=LeaveRequestResponse, status_code=201)
def submit_leave_request(
    payload: LeaveRequestCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LeaveRequestResponse:
    profile = db.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    leave_type = db.scalar(select(LeaveType).where(LeaveType.id == payload.leave_type_id, LeaveType.organization_id == current_user.organization_id))
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    risk = _coverage(db, profile, payload.start_date, payload.end_date)
    request = LeaveRequest(
        employee_id=profile.id,
        leave_type_id=payload.leave_type_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=_days(payload.start_date, payload.end_date),
        reason=payload.reason,
        status="PENDING",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return _serialize(request, risk)


@router.get("/requests/me", response_model=list[LeaveRequestResponse])
def my_leave_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[LeaveRequestResponse]:
    profile = db.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id))
    if not profile:
        return []
    requests = db.scalars(select(LeaveRequest).where(LeaveRequest.employee_id == profile.id).order_by(LeaveRequest.created_at.desc())).all()
    return [_serialize(request) for request in requests]


@router.get("/requests", response_model=list[LeaveRequestResponse])
def approval_queue(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: str = "PENDING",
) -> list[LeaveRequestResponse]:
    requests = db.scalars(
        select(LeaveRequest)
        .join(LeaveRequest.employee)
        .join(EmployeeProfile.user)
        .options(joinedload(LeaveRequest.employee))
        .where(User.organization_id == admin.organization_id, LeaveRequest.status == status_filter)
        .order_by(LeaveRequest.created_at.asc())
    ).all()
    return [_serialize(request, _coverage(db, request.employee, request.start_date, request.end_date)) for request in requests]


@router.post("/requests/{request_id}/approve", response_model=LeaveRequestResponse)
def approve_leave_request(
    request_id: str,
    payload: LeaveDecision,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LeaveRequestResponse:
    # The request and its balance are locked in one transaction to prevent two
    # administrators from spending the same remaining leave balance. The auth
    # dependency may have opened a read transaction on this session already.
    db.rollback()
    with db.begin():
        request = db.scalar(
            select(LeaveRequest)
            .join(LeaveRequest.employee)
            .join(EmployeeProfile.user)
            .where(LeaveRequest.id == request_id, User.organization_id == admin.organization_id)
            .with_for_update()
        )
        if not request:
            raise HTTPException(status_code=404, detail="Leave request not found")
        if request.status != "PENDING":
            raise HTTPException(status_code=409, detail=f"Request is already {request.status.lower()}")
        balance = db.scalar(
            select(LeaveBalance)
            .where(
                LeaveBalance.employee_id == request.employee_id,
                LeaveBalance.leave_type_id == request.leave_type_id,
                LeaveBalance.year == request.start_date.year,
            )
            .with_for_update()
        )
        if not balance or balance.remaining < request.days:
            raise HTTPException(status_code=409, detail="Insufficient leave balance")
        previous = request.status
        balance.used += request.days
        request.status = "APPROVED"
        request.current_approver_id = admin.id
        request.updated_at = datetime.now(timezone.utc)
        db.add(LeaveApprovalEvent(leave_request_id=request.id, actor_id=admin.id, from_status=previous, to_status="APPROVED", note=payload.note))
    publish_event(DomainEvent("leave_approved", datetime.now(timezone.utc), {"leave_request_id": request_id, "employee_id": request.employee_id}))
    return _serialize(request, _coverage(db, request.employee, request.start_date, request.end_date))


@router.post("/requests/{request_id}/reject", response_model=LeaveRequestResponse)
def reject_leave_request(
    request_id: str,
    payload: LeaveDecision,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LeaveRequestResponse:
    db.rollback()
    with db.begin():
        request = db.scalar(
            select(LeaveRequest)
            .join(LeaveRequest.employee)
            .join(EmployeeProfile.user)
            .where(LeaveRequest.id == request_id, User.organization_id == admin.organization_id)
            .with_for_update()
        )
        if not request:
            raise HTTPException(status_code=404, detail="Leave request not found")
        if request.status != "PENDING":
            raise HTTPException(status_code=409, detail=f"Request is already {request.status.lower()}")
        previous = request.status
        request.status = "REJECTED"
        request.current_approver_id = admin.id
        request.updated_at = datetime.now(timezone.utc)
        db.add(LeaveApprovalEvent(leave_request_id=request.id, actor_id=admin.id, from_status=previous, to_status="REJECTED", note=payload.note))
    return _serialize(request, _coverage(db, request.employee, request.start_date, request.end_date))


@router.get("/balances/me", response_model=list[LeaveBalanceResponse])
def my_leave_balances(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    year: int | None = None,
) -> list[LeaveBalanceResponse]:
    profile = db.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id))
    if not profile:
        return []
    query = select(LeaveBalance).where(LeaveBalance.employee_id == profile.id)
    if year:
        query = query.where(LeaveBalance.year == year)
    balances = db.scalars(query.order_by(LeaveBalance.year.desc())).all()
    return [LeaveBalanceResponse.model_validate(balance).model_copy(update={"remaining": balance.remaining}) for balance in balances]
