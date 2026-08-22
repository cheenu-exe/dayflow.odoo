from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=160)
    organization_name: str = Field(min_length=1, max_length=160)
    timezone: str = Field(default="UTC", min_length=1, max_length=64)


class UserSummary(APIModel):
    id: str
    email: EmailStr
    role: str
    organization_id: str


class LoginResponse(Token):
    user: UserSummary


class TeamSummary(APIModel):
    id: str
    name: str


class ProfileResponse(APIModel):
    id: str
    user_id: str
    team_id: str
    full_name: str
    job_title: str
    join_date: date
    timezone: str
    phone: Optional[str] = None
    team: Optional[TeamSummary] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=40)
    timezone: Optional[str] = Field(default=None, max_length=64)
    job_title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    team_id: Optional[str] = None


class AttendanceCheckIn(BaseModel):
    local_date: date
    timezone: str = Field(min_length=1, max_length=64)
    check_in_local: datetime
    source: Literal["WEB", "PASSKEY"] = "WEB"

    @field_validator("check_in_local")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("check_in_local must include a timezone offset")
        return value


class PasskeyCheckIn(AttendanceCheckIn):
    credential: dict[str, Any]


class AttendanceCheckOut(BaseModel):
    check_out_local: datetime

    @field_validator("check_out_local")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("check_out_local must include a timezone offset")
        return value


class AttendanceResponse(APIModel):
    id: str
    user_id: str
    local_date: date
    timezone: str
    check_in_utc: datetime
    check_out_utc: Optional[datetime] = None
    worked_hours: Optional[Decimal] = None
    source: str


class AnomalyAlertResponse(APIModel):
    id: str
    attendance_id: str
    severity: str
    reason: str
    score: Optional[Decimal] = None
    status: str
    created_at: datetime
    attendance: Optional[AttendanceResponse] = None


class LeaveRequestCreate(BaseModel):
    leave_type_id: str
    start_date: date
    end_date: date
    reason: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, value: date, info) -> date:
        start = info.data.get("start_date")
        if start and value < start:
            raise ValueError("end_date must be on or after start_date")
        return value


class CoverageRisk(APIModel):
    level: Literal["GREEN", "AMBER", "RED"]
    staffing_ratio: float
    team_size: int
    affected_dates: list[date]
    message: str


class LeaveRequestResponse(APIModel):
    id: str
    employee_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    days: Decimal
    reason: Optional[str] = None
    status: str
    current_approver_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    coverage_risk: Optional[CoverageRisk] = None


class LeaveDecision(BaseModel):
    note: Optional[str] = Field(default=None, max_length=2000)


class LeaveBalanceResponse(APIModel):
    id: str
    employee_id: str
    leave_type_id: str
    year: int
    entitled: Decimal
    used: Decimal
    remaining: Decimal


class SalaryStructureCreate(BaseModel):
    effective_from: date
    basic_monthly: Decimal = Field(gt=0)
    housing_monthly: Decimal = Field(default=Decimal("0.00"), ge=0)
    transport_monthly: Decimal = Field(default=Decimal("0.00"), ge=0)


class SalaryStructureResponse(APIModel):
    id: str
    employee_id: str
    effective_from: date
    basic_monthly: Decimal
    housing_monthly: Decimal
    transport_monthly: Decimal


class PayslipResponse(BaseModel):
    employee_id: str
    month: date
    days_in_month: int
    eligible_days: int
    proration_factor: Decimal
    basic_prorated: Decimal
    housing_prorated: Decimal
    transport_prorated: Decimal
    gross_prorated: Decimal


class DashboardResponse(BaseModel):
    today_attendance: Optional[AttendanceResponse] = None
    upcoming_leave: list[LeaveRequestResponse]
    open_anomalies: int
    insight: str


class LeaveTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    annual_days: Decimal = Field(default=Decimal("20.00"), gt=0)


class LeaveTypeResponse(APIModel):
    id: str
    organization_id: str
    name: str
    annual_days: Decimal


class LeaveBalanceCreate(BaseModel):
    employee_id: str
    leave_type_id: str
    year: int
    entitled: Decimal = Field(gt=0)


class AdminDashboardResponse(BaseModel):
    pending_leave_count: int
    open_alerts_count: int
    todays_team_checkins: int
    total_employees: int
    leave_queue: list[LeaveRequestResponse]
    recent_alerts: list[AnomalyAlertResponse]

