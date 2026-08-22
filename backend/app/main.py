from datetime import date
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.deps import get_admin_user, get_current_user
from app.models import AnomalyAlert, AttendanceRecord, EmployeeProfile, LeaveRequest, User
from app.routers import attendance, auth, chat, leave, payroll, profiles
from app.schemas import AdminDashboardResponse, DashboardResponse

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Dayflow modular-monolith backend for attendance, leave, payroll, and HR intelligence.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(profiles.router, prefix="/api/v1")
app.include_router(attendance.router, prefix="/api/v1")
app.include_router(leave.router, prefix="/api/v1")
app.include_router(payroll.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


@app.get("/", tags=["system"])
def root() -> dict:
    return {
        "service": "Dayflow HRMS Lean Monolith API",
        "status": "online",
        "documentation": "/docs",
        "health": "/health",
        "api_v1_base": "/api/v1",
        "demo_credentials": {
            "admin": {"email": "admin@dayflow.com", "password": "Admin@1234"},
            "alice": {"email": "alice@dayflow.com", "password": "Alice@1234"},
            "bob": {"email": "bob@dayflow.com", "password": "Bob@1234"},
        },
    }


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "dayflow-api"}



@app.get("/api/v1/dashboard/me", response_model=DashboardResponse, tags=["dashboard"])
def dashboard_me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DashboardResponse:
    today = date.today()
    profile = db.scalar(select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id))
    today_attendance = db.scalar(select(AttendanceRecord).where(AttendanceRecord.user_id == current_user.id, AttendanceRecord.local_date == today))
    requests = []
    if profile:
        requests = db.scalars(
            select(LeaveRequest)
            .where(LeaveRequest.employee_id == profile.id, LeaveRequest.status.in_(["PENDING", "APPROVED"]), LeaveRequest.end_date >= today)
            .order_by(LeaveRequest.start_date)
            .limit(5)
        ).all()
    open_anomalies = db.scalar(
        select(func.count(AnomalyAlert.id))
        .join(AnomalyAlert.attendance)
        .where(AttendanceRecord.user_id == current_user.id, AnomalyAlert.status == "OPEN")
    ) or 0
    return DashboardResponse(
        today_attendance=today_attendance,
        upcoming_leave=requests,
        open_anomalies=int(open_anomalies),
        insight=f"You have {int(open_anomalies)} open attendance alert(s)." if open_anomalies else "Your attendance looks normal.",
    )


@app.get("/api/v1/dashboard/admin", response_model=AdminDashboardResponse, tags=["dashboard"])
def dashboard_admin(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminDashboardResponse:
    today = date.today()
    pending_leave_count = db.scalar(
        select(func.count(LeaveRequest.id))
        .join(LeaveRequest.employee)
        .join(EmployeeProfile.user)
        .where(User.organization_id == admin.organization_id, LeaveRequest.status == "PENDING")
    ) or 0

    open_alerts_count = db.scalar(
        select(func.count(AnomalyAlert.id))
        .join(AnomalyAlert.attendance)
        .join(AttendanceRecord.user)
        .where(User.organization_id == admin.organization_id, AnomalyAlert.status == "OPEN")
    ) or 0

    todays_checkins = db.scalar(
        select(func.count(AttendanceRecord.id))
        .join(AttendanceRecord.user)
        .where(User.organization_id == admin.organization_id, AttendanceRecord.local_date == today)
    ) or 0

    total_employees = db.scalar(
        select(func.count(EmployeeProfile.id))
        .join(EmployeeProfile.user)
        .where(User.organization_id == admin.organization_id)
    ) or 0

    leave_queue = db.scalars(
        select(LeaveRequest)
        .join(LeaveRequest.employee)
        .join(EmployeeProfile.user)
        .where(User.organization_id == admin.organization_id, LeaveRequest.status == "PENDING")
        .order_by(LeaveRequest.created_at.asc())
        .limit(10)
    ).all()

    recent_alerts = db.scalars(
        select(AnomalyAlert)
        .join(AnomalyAlert.attendance)
        .join(AttendanceRecord.user)
        .where(User.organization_id == admin.organization_id, AnomalyAlert.status == "OPEN")
        .order_by(AnomalyAlert.created_at.desc())
        .limit(10)
    ).all()

    from app.routers.leave import _serialize as serialize_leave
    serialized_queue = [serialize_leave(r) for r in leave_queue]

    return AdminDashboardResponse(
        pending_leave_count=int(pending_leave_count),
        open_alerts_count=int(open_alerts_count),
        todays_team_checkins=int(todays_checkins),
        total_employees=int(total_employees),
        leave_queue=serialized_queue,
        recent_alerts=recent_alerts,
    )
