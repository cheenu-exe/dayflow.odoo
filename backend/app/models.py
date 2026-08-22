from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    teams: Mapped[list["Team"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship(back_populates="organization", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    organization: Mapped[Organization] = relationship(back_populates="teams")
    profiles: Mapped[list["EmployeeProfile"]] = relationship(back_populates="team")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="EMPLOYEE", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    organization: Mapped[Organization] = relationship(back_populates="users")
    profile: Mapped[Optional["EmployeeProfile"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    attendance: Mapped[list["AttendanceRecord"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    approval_events: Mapped[list["LeaveApprovalEvent"]] = relationship(back_populates="actor")
    passkeys: Mapped[list["PasskeyCredential"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    job_title: Mapped[str] = mapped_column(String(160), nullable=False)
    join_date: Mapped[date] = mapped_column(Date, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(40))

    user: Mapped[User] = relationship(back_populates="profile")
    team: Mapped[Team] = relationship(back_populates="profiles")
    salary_structures: Mapped[list["SalaryStructure"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    leave_balances: Mapped[list["LeaveBalance"]] = relationship(back_populates="employee", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    local_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    check_in_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out_utc: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    worked_hours: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    source: Mapped[str] = mapped_column(String(30), default="WEB", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped[User] = relationship(back_populates="attendance")
    anomaly_alert: Mapped[Optional["AnomalyAlert"]] = relationship(back_populates="attendance", uselist=False, cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("user_id", "local_date", name="uq_attendance_user_date"),)


class LeaveType(Base):
    __tablename__ = "leave_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    annual_days: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal("20.00"), nullable=False)

    organization: Mapped[Organization] = relationship()
    requests: Mapped[list["LeaveRequest"]] = relationship(back_populates="leave_type")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employee_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id: Mapped[str] = mapped_column(ForeignKey("leave_types.id", ondelete="CASCADE"), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    entitled: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    used: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal("0.00"), nullable=False)

    employee: Mapped[EmployeeProfile] = relationship(back_populates="leave_balances")
    leave_type: Mapped[LeaveType] = relationship()
    __table_args__ = (UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_leave_balance"),)

    @property
    def remaining(self) -> Decimal:
        return self.entitled - self.used


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employee_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id: Mapped[str] = mapped_column(ForeignKey("leave_types.id", ondelete="RESTRICT"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)
    current_approver_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    employee: Mapped[EmployeeProfile] = relationship(foreign_keys=[employee_id])
    leave_type: Mapped[LeaveType] = relationship(back_populates="requests")
    approver: Mapped[Optional[User]] = relationship(foreign_keys=[current_approver_id])
    approval_events: Mapped[list["LeaveApprovalEvent"]] = relationship(back_populates="leave_request", cascade="all, delete-orphan")


class LeaveApprovalEvent(Base):
    __tablename__ = "leave_approval_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    leave_request_id: Mapped[str] = mapped_column(ForeignKey("leave_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    from_status: Mapped[Optional[str]] = mapped_column(String(30))
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    leave_request: Mapped[LeaveRequest] = relationship(back_populates="approval_events")
    actor: Mapped[User] = relationship(back_populates="approval_events")


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employee_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    basic_monthly: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    housing_monthly: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    transport_monthly: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    employee: Mapped[EmployeeProfile] = relationship(back_populates="salary_structures")


class AnomalyAlert(Base):
    __tablename__ = "anomaly_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    attendance_id: Mapped[str] = mapped_column(ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, unique=True)
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    attendance: Mapped[AttendanceRecord] = relationship(back_populates="anomaly_alert")


class PasskeyCredential(Base):
    __tablename__ = "passkey_credentials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credential_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    public_key: Mapped[str] = mapped_column(Text, nullable=False)
    sign_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped[User] = relationship(back_populates="passkeys")
