from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app
from app.models import EmployeeProfile, LeaveBalance, LeaveRequest, LeaveType, Organization, SalaryStructure, Team, User
from app.security import hash_password
from app.services.ml_contract import calculate_coverage_risk


@pytest.fixture()
def client(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    db = TestingSession()
    org = Organization(name="Dayflow Test Org")
    team = Team(name="Engineering", organization=org)
    leave_type = LeaveType(name="Annual", annual_days=Decimal("20"), organization=org)
    admin = User(email="admin@example.com", password_hash=hash_password("adminpass"), role="HR_ADMIN", organization=org)
    employee = User(email="employee@example.com", password_hash=hash_password("employeepass"), role="EMPLOYEE", organization=org)
    admin_profile = EmployeeProfile(user=admin, team=team, full_name="Admin User", job_title="HR", join_date=date(2024, 1, 1), timezone="UTC")
    employee_profile = EmployeeProfile(user=employee, team=team, full_name="Employee User", job_title="Engineer", join_date=date(2026, 8, 15), timezone="America/New_York")
    balance = LeaveBalance(employee=employee_profile, leave_type=leave_type, year=2026, entitled=Decimal("20"), used=Decimal("0"))
    salary = SalaryStructure(employee=employee_profile, effective_from=date(2026, 1, 1), basic_monthly=Decimal("3000"), housing_monthly=Decimal("600"), transport_monthly=Decimal("300"))
    db.add_all([org, team, leave_type, admin, employee, admin_profile, employee_profile, balance, salary])
    db.commit()
    employee_id = employee.id
    leave_type_id = leave_type.id
    db.close()

    def override_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        test_client.employee_id = employee_id
        test_client.leave_type_id = leave_type_id
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


def login(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_register_creates_admin_and_starter_balance(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new-owner@example.com",
            "password": "newownerpass",
            "full_name": "New Owner",
            "organization_name": "New Dayflow Org",
            "timezone": "Asia/Tokyo",
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["user"]["role"] == "HR_ADMIN"


def test_timezone_attendance_and_anomaly(client: TestClient):
    headers = login(client, "employee@example.com", "employeepass")
    check_in = client.post(
        "/api/v1/attendance/check-in",
        headers=headers,
        json={"local_date": "2026-08-20", "timezone": "America/New_York", "check_in_local": "2026-08-20T09:00:00-04:00"},
    )
    assert check_in.status_code == 201, check_in.text
    body = check_in.json()
    assert body["check_in_utc"].startswith("2026-08-20T13:00:00")

    checkout = client.post(
        f"/api/v1/attendance/{body['id']}/check-out",
        headers=headers,
        json={"check_out_local": "2026-08-20T23:30:00-04:00"},
    )
    assert checkout.status_code == 200
    assert Decimal(str(checkout.json()["worked_hours"])) == Decimal("14.50")


def test_passkey_checkin_does_not_persist_unverified_credentials(client: TestClient):
    headers = login(client, "employee@example.com", "employeepass")
    response = client.post(
        "/api/v1/attendance/passkey/check-in",
        headers=headers,
        json={
            "local_date": "2026-08-21",
            "timezone": "America/New_York",
            "check_in_local": "2026-08-21T09:00:00-04:00",
            "credential": {"id": "not-verified"},
        },
    )
    assert response.status_code == 501


def test_leave_request_returns_red_coverage(client: TestClient):
    headers = login(client, "employee@example.com", "employeepass")
    response = client.post(
        "/api/v1/leave/requests",
        headers=headers,
        json={"leave_type_id": client.leave_type_id, "start_date": "2026-08-24", "end_date": "2026-08-24", "reason": "Personal"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["coverage_risk"]["level"] == "AMBER"  # One of two team members remains staffed.


def test_coverage_thresholds_are_strictly_green_amber_red():
    affected = [date(2026, 8, 24)]
    assert calculate_coverage_risk(10, [4], affected).level == "GREEN"
    assert calculate_coverage_risk(10, [5], affected).level == "AMBER"
    assert calculate_coverage_risk(10, [7], affected).level == "RED"


def test_admin_approval_spends_balance_and_exposes_event(client: TestClient):
    employee_headers = login(client, "employee@example.com", "employeepass")
    created = client.post(
        "/api/v1/leave/requests",
        headers=employee_headers,
        json={"leave_type_id": client.leave_type_id, "start_date": "2026-09-01", "end_date": "2026-09-02"},
    )
    assert created.status_code == 201
    admin_headers = login(client, "admin@example.com", "adminpass")
    approved = client.post(f"/api/v1/leave/requests/{created.json()['id']}/approve", headers=admin_headers, json={"note": "Approved"})
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "APPROVED"
    balances = client.get("/api/v1/leave/balances/me", headers=employee_headers)
    assert balances.json()[0]["used"] == "2.00"
    assert balances.json()[0]["remaining"] == "18.00"


def test_admin_team_attendance_feed_is_organization_scoped(client: TestClient):
    headers = login(client, "admin@example.com", "adminpass")
    response = client.get("/api/v1/attendance/team", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_mid_month_payroll_is_inclusive_and_deterministic(client: TestClient):
    headers = login(client, "employee@example.com", "employeepass")
    response = client.get("/api/v1/payroll/me/payslip?month=2026-08-01", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["days_in_month"] == 31
    assert body["eligible_days"] == 17  # Aug 15 through Aug 31, inclusive.
    assert body["basic_prorated"] == "1645.16"
