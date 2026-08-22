from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps import get_admin_user, get_current_user
from app.models import AnomalyAlert, AttendanceRecord, EmployeeProfile, User
from app.schemas import AnomalyAlertResponse, AttendanceCheckIn, AttendanceCheckOut, AttendanceResponse, PasskeyCheckIn
from app.services.anomaly import evaluate_attendance_rules
from app.services.domain import calculate_worked_hours, to_utc
from app.services.events import DomainEvent, publish_event

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _check_in(db: Session, user: User, payload: AttendanceCheckIn) -> AttendanceRecord:
    existing = db.scalar(select(AttendanceRecord).where(AttendanceRecord.user_id == user.id, AttendanceRecord.local_date == payload.local_date))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in for this local date")
    try:
        check_in_utc = to_utc(payload.check_in_local, payload.timezone)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    record = AttendanceRecord(
        user_id=user.id,
        local_date=payload.local_date,
        timezone=payload.timezone,
        check_in_utc=check_in_utc,
        source=payload.source,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    is_anomaly, reason, severity = evaluate_attendance_rules(payload.check_in_local, None)
    if is_anomaly and reason:
        alert = AnomalyAlert(attendance_id=record.id, reason=reason, severity=severity)
        db.add(alert)
        db.commit()
        publish_event(DomainEvent("anomaly_detected", datetime.now(timezone.utc), {"attendance_id": record.id, "user_id": user.id, "reason": reason}))
    return record


@router.post("/check-in", response_model=AttendanceResponse, status_code=201)
def check_in(
    payload: AttendanceCheckIn,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AttendanceResponse:
    return _check_in(db, current_user, payload)


@router.post("/passkey/check-in", response_model=AttendanceResponse, status_code=201)
def passkey_check_in(
    payload: PasskeyCheckIn,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AttendanceResponse:
    """Verify the browser assertion, then persist the check-in as PASSKEY."""
    from app.services.passkey import verify_passkey_assertion

    verify_passkey_assertion(current_user.id, payload.credential)
    attendance_payload = AttendanceCheckIn(
        local_date=payload.local_date,
        timezone=payload.timezone,
        check_in_local=payload.check_in_local,
        source="PASSKEY",
    )
    return _check_in(db, current_user, attendance_payload)


@router.post("/{attendance_id}/check-out", response_model=AttendanceResponse)
def check_out(
    attendance_id: str,
    payload: AttendanceCheckOut,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AttendanceResponse:
    record = db.scalar(select(AttendanceRecord).where(AttendanceRecord.id == attendance_id, AttendanceRecord.user_id == current_user.id))
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    if record.check_out_utc:
        raise HTTPException(status_code=409, detail="Already checked out")
    try:
        check_out_utc = to_utc(payload.check_out_local, record.timezone)
        worked_hours = calculate_worked_hours(record.check_in_utc, check_out_utc)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    record.check_out_utc = check_out_utc
    record.worked_hours = worked_hours
    db.commit()
    db.refresh(record)

    is_anomaly, reason, severity = evaluate_attendance_rules(payload.check_out_local, worked_hours)
    if is_anomaly and reason and not record.anomaly_alert:
        db.add(AnomalyAlert(attendance_id=record.id, reason=reason, severity=severity))
        db.commit()
        publish_event(DomainEvent("anomaly_detected", datetime.now(timezone.utc), {"attendance_id": record.id, "user_id": current_user.id, "reason": reason}))
    return record


@router.get("/me", response_model=list[AttendanceResponse])
def my_attendance(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = 60,
) -> list[AttendanceResponse]:
    limit = min(max(limit, 1), 180)
    return db.scalars(
        select(AttendanceRecord).where(AttendanceRecord.user_id == current_user.id).order_by(AttendanceRecord.local_date.desc()).limit(limit)
    ).all()


@router.get("/team", response_model=list[AttendanceResponse])
def team_attendance(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    start_date: date | None = None,
    end_date: date | None = None,
    team_id: str | None = None,
) -> list[AttendanceResponse]:
    query = (
        select(AttendanceRecord)
        .join(AttendanceRecord.user)
        .join(User.profile)
        .where(User.organization_id == admin.organization_id)
        .order_by(AttendanceRecord.local_date.desc())
    )
    if start_date:
        query = query.where(AttendanceRecord.local_date >= start_date)
    if end_date:
        query = query.where(AttendanceRecord.local_date <= end_date)
    if team_id:
        query = query.where(EmployeeProfile.team_id == team_id)
    return db.scalars(query.limit(2000)).all()


@router.get("/alerts", response_model=list[AnomalyAlertResponse])
def anomaly_alerts(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: str = "OPEN",
) -> list[AnomalyAlertResponse]:
    alerts = db.scalars(
        select(AnomalyAlert)
        .join(AnomalyAlert.attendance)
        .join(AttendanceRecord.user)
        .options(joinedload(AnomalyAlert.attendance))
        .where(User.organization_id == admin.organization_id, AnomalyAlert.status == status_filter)
        .order_by(AnomalyAlert.created_at.desc())
    ).all()
    return alerts


@router.patch("/alerts/{alert_id}/resolve", response_model=AnomalyAlertResponse)
def resolve_alert(
    alert_id: str,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AnomalyAlertResponse:
    alert = db.scalar(
        select(AnomalyAlert)
        .join(AnomalyAlert.attendance)
        .join(AttendanceRecord.user)
        .options(joinedload(AnomalyAlert.attendance))
        .where(AnomalyAlert.id == alert_id, User.organization_id == admin.organization_id)
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Anomaly alert not found")
    alert.status = "RESOLVED"
    db.commit()
    db.refresh(alert)
    return alert
