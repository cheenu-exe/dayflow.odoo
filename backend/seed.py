import os
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.db import Base, SessionLocal, engine
from app.models import (
    AnomalyAlert,
    AttendanceRecord,
    EmployeeProfile,
    LeaveApprovalEvent,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    Organization,
    SalaryStructure,
    Team,
    User,
)
from app.security import hash_password
from app.services.domain import to_utc
from app.services.ml_anomaly import train_model


def seed_database():
    print("Resetting database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Creating Organization & Teams...")
        org = Organization(name="Dayflow Corp")
        db.add(org)
        db.flush()

        eng_team = Team(organization_id=org.id, name="Engineering")
        sales_team = Team(organization_id=org.id, name="Sales")
        hr_team = Team(organization_id=org.id, name="HR")
        db.add_all([eng_team, sales_team, hr_team])
        db.flush()

        print("Creating 5 Curated Demo Employees...")
        
        # 1. Sarah Jenkins (Admin)
        admin_user = User(
            organization_id=org.id,
            email="admin@dayflow.com",
            password_hash=hash_password("Admin@1234"),
            role="HR_ADMIN",
            is_active=True,
        )
        db.add(admin_user)
        db.flush()
        admin_profile = EmployeeProfile(
            user_id=admin_user.id,
            team_id=hr_team.id,
            full_name="Sarah Jenkins",
            job_title="HR Operations Director",
            join_date=date(2023, 1, 15),
            timezone="America/New_York",
            phone="+1-555-0100",
        )
        db.add(admin_profile)
        db.flush()
        db.add(
            SalaryStructure(
                employee_id=admin_profile.id,
                effective_from=date(2023, 1, 15),
                basic_monthly=Decimal("95000.00"),
                housing_monthly=Decimal("18000.00"),
                transport_monthly=Decimal("6000.00"),
            )
        )

        # 2. Alice Chen (Lead)
        alice_user = User(
            organization_id=org.id,
            email="alice@dayflow.com",
            password_hash=hash_password("Alice@1234"),
            role="EMPLOYEE",
            is_active=True,
        )
        db.add(alice_user)
        db.flush()
        alice_profile = EmployeeProfile(
            user_id=alice_user.id,
            team_id=eng_team.id,
            full_name="Alice Chen",
            job_title="Senior Full-Stack Lead",
            join_date=date(2024, 2, 1),
            timezone="America/New_York",
            phone="+1-555-0101",
        )
        db.add(alice_profile)
        db.flush()
        db.add(
            SalaryStructure(
                employee_id=alice_profile.id,
                effective_from=alice_profile.join_date,
                basic_monthly=Decimal("85000.00"),
                housing_monthly=Decimal("15000.00"),
                transport_monthly=Decimal("5000.00"),
            )
        )

        # 3. Bob Okafor (Mid-Month Joiner)
        current_month = date.today().replace(day=1)
        mid_month_date = current_month.replace(day=15)
        bob_user = User(
            organization_id=org.id,
            email="bob@dayflow.com",
            password_hash=hash_password("Bob@1234"),
            role="EMPLOYEE",
            is_active=True,
        )
        db.add(bob_user)
        db.flush()
        bob_profile = EmployeeProfile(
            user_id=bob_user.id,
            team_id=sales_team.id,
            full_name="Bob Okafor",
            job_title="Account Executive",
            join_date=mid_month_date,
            timezone="Asia/Kolkata",
            phone="+91-98765-43210",
        )
        db.add(bob_profile)
        db.flush()
        db.add(
            SalaryStructure(
                employee_id=bob_profile.id,
                effective_from=mid_month_date,
                basic_monthly=Decimal("50000.00"),
                housing_monthly=Decimal("10000.00"),
                transport_monthly=Decimal("5000.00"),
            )
        )

        # 4. Clara Vance (HR Specialist)
        clara_user = User(
            organization_id=org.id,
            email="clara@dayflow.com",
            password_hash=hash_password("Clara@1234"),
            role="EMPLOYEE",
            is_active=True,
        )
        db.add(clara_user)
        db.flush()
        clara_profile = EmployeeProfile(
            user_id=clara_user.id,
            team_id=hr_team.id,
            full_name="Clara Vance",
            job_title="People & Culture Specialist",
            join_date=date(2024, 3, 1),
            timezone="Europe/London",
            phone="+44-20-7946-0991",
        )
        db.add(clara_profile)
        db.flush()
        db.add(
            SalaryStructure(
                employee_id=clara_profile.id,
                effective_from=clara_profile.join_date,
                basic_monthly=Decimal("55000.00"),
                housing_monthly=Decimal("11000.00"),
                transport_monthly=Decimal("4000.00"),
            )
        )

        # 5. David Kim (DevOps Lead)
        david_user = User(
            organization_id=org.id,
            email="david@dayflow.com",
            password_hash=hash_password("David@1234"),
            role="EMPLOYEE",
            is_active=True,
        )
        db.add(david_user)
        db.flush()
        david_profile = EmployeeProfile(
            user_id=david_user.id,
            team_id=eng_team.id,
            full_name="David Kim",
            job_title="DevOps & Cloud Architect",
            join_date=date(2024, 1, 10),
            timezone="America/Los_Angeles",
            phone="+1-555-0188",
        )
        db.add(david_profile)
        db.flush()
        db.add(
            SalaryStructure(
                employee_id=david_profile.id,
                effective_from=david_profile.join_date,
                basic_monthly=Decimal("88000.00"),
                housing_monthly=Decimal("16000.00"),
                transport_monthly=Decimal("5000.00"),
            )
        )

        all_employees = [admin_profile, alice_profile, bob_profile, clara_profile, david_profile]
        all_users = [admin_user, alice_user, bob_user, clara_user, david_user]

        print("Setting up Leave Policies & Allocating Balances...")
        paid_leave = LeaveType(organization_id=org.id, name="Paid Annual Leave", annual_days=Decimal("20.00"))
        sick_leave = LeaveType(organization_id=org.id, name="Sick Leave", annual_days=Decimal("10.00"))
        unpaid_leave = LeaveType(organization_id=org.id, name="Unpaid Leave", annual_days=Decimal("365.00"))
        db.add_all([paid_leave, sick_leave, unpaid_leave])
        db.flush()

        current_year = date.today().year
        for emp in all_employees:
            db.add(LeaveBalance(employee_id=emp.id, leave_type_id=paid_leave.id, year=current_year, entitled=Decimal("20.00"), used=Decimal("3.00") if emp == alice_profile else Decimal("0.00")))
            db.add(LeaveBalance(employee_id=emp.id, leave_type_id=sick_leave.id, year=current_year, entitled=Decimal("10.00"), used=Decimal("0.00")))

        print("Generating realistic 45-day attendance history & training ML IsolationForest...")
        today = date.today()
        normal_records = []

        for d in range(45, 1, -1):
            check_date = today - timedelta(days=d)
            if check_date.weekday() < 5:
                # Alice attendance
                in_time = datetime(check_date.year, check_date.month, check_date.day, 8, 30, 0)
                out_time = datetime(check_date.year, check_date.month, check_date.day, 17, 15, 0)
                rec = AttendanceRecord(
                    user_id=alice_user.id,
                    local_date=check_date,
                    timezone="America/New_York",
                    check_in_utc=to_utc(in_time, "America/New_York"),
                    check_out_utc=to_utc(out_time, "America/New_York"),
                    worked_hours=Decimal("8.75"),
                    source="WEB",
                )
                db.add(rec)
                normal_records.append(rec)

                # David attendance
                in_time_d = datetime(check_date.year, check_date.month, check_date.day, 9, 0, 0)
                out_time_d = datetime(check_date.year, check_date.month, check_date.day, 17, 30, 0)
                rec_d = AttendanceRecord(
                    user_id=david_user.id,
                    local_date=check_date,
                    timezone="America/Los_Angeles",
                    check_in_utc=to_utc(in_time_d, "America/Los_Angeles"),
                    check_out_utc=to_utc(out_time_d, "America/Los_Angeles"),
                    worked_hours=Decimal("8.50"),
                    source="WEB",
                )
                db.add(rec_d)
                normal_records.append(rec_d)

        # Today's live check-ins for demo
        today_alice = AttendanceRecord(
            user_id=alice_user.id,
            local_date=today,
            timezone="America/New_York",
            check_in_utc=to_utc(datetime(today.year, today.month, today.day, 8, 45, 0), "America/New_York"),
            source="WEB",
        )
        db.add(today_alice)

        today_david = AttendanceRecord(
            user_id=david_user.id,
            local_date=today,
            timezone="America/Los_Angeles",
            check_in_utc=to_utc(datetime(today.year, today.month, today.day, 9, 10, 0), "America/Los_Angeles"),
            source="WEB",
        )
        db.add(today_david)

        db.commit()

        # Seed ML Anomalies
        print("Injecting 3 Demo Anomaly Alerts...")
        anom_date_1 = today - timedelta(days=1)
        anom_rec_1 = AttendanceRecord(
            user_id=david_user.id,
            local_date=anom_date_1,
            timezone="America/Los_Angeles",
            check_in_utc=to_utc(datetime(anom_date_1.year, anom_date_1.month, anom_date_1.day, 8, 0, 0), "America/Los_Angeles"),
            check_out_utc=to_utc(datetime(anom_date_1.year, anom_date_1.month, anom_date_1.day, 22, 30, 0), "America/Los_Angeles"),
            worked_hours=Decimal("14.50"),
            source="WEB",
        )
        db.add(anom_rec_1)
        db.flush()
        db.add(
            AnomalyAlert(
                attendance_id=anom_rec_1.id,
                reason="Worked hours exceed 14 hours (14.50 hrs)",
                severity="HIGH",
                score=Decimal("-0.2450"),
                status="OPEN",
            )
        )

        anom_date_2 = today - timedelta(days=2)
        anom_rec_2 = AttendanceRecord(
            user_id=clara_user.id,
            local_date=anom_date_2,
            timezone="Europe/London",
            check_in_utc=to_utc(datetime(anom_date_2.year, anom_date_2.month, anom_date_2.day, 14, 30, 0), "Europe/London"),
            check_out_utc=to_utc(datetime(anom_date_2.year, anom_date_2.month, anom_date_2.day, 18, 0, 0), "Europe/London"),
            worked_hours=Decimal("3.50"),
            source="WEB",
        )
        db.add(anom_rec_2)
        db.flush()
        db.add(
            AnomalyAlert(
                attendance_id=anom_rec_2.id,
                reason="Check-in time later than 10:00 AM (14:30 London)",
                severity="MEDIUM",
                score=Decimal("-0.1120"),
                status="OPEN",
            )
        )

        # Seed Pending Leave Requests with ML Staffing Risk
        print("Seeding Overlapping Leave Requests (ML Staffing Risk)...")
        leave_start = today + timedelta(days=5)
        leave_end = today + timedelta(days=9)

        # Alice's leave request (Approved)
        alice_leave = LeaveRequest(
            employee_id=alice_profile.id,
            leave_type_id=paid_leave.id,
            start_date=leave_start,
            end_date=leave_end,
            days=Decimal("5.00"),
            reason="Annual vacation with family",
            status="APPROVED",
            current_approver_id=admin_user.id,
        )
        db.add(alice_leave)
        db.flush()
        db.add(
            LeaveApprovalEvent(
                leave_request_id=alice_leave.id,
                actor_id=admin_user.id,
                from_status="PENDING",
                to_status="APPROVED",
                note="Approved: Early submission covered.",
            )
        )

        # David's concurrent leave request in Engineering (Triggers RED staffing risk!)
        david_leave = LeaveRequest(
            employee_id=david_profile.id,
            leave_type_id=paid_leave.id,
            start_date=leave_start + timedelta(days=1),
            end_date=leave_end,
            days=Decimal("4.00"),
            reason="Attending DevOps Cloud Conference",
            status="PENDING",
        )
        db.add(david_leave)

        # Bob's leave request (Pending Amber)
        bob_leave = LeaveRequest(
            employee_id=bob_profile.id,
            leave_type_id=sick_leave.id,
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=3),
            days=Decimal("2.00"),
            reason="Medical recovery",
            status="PENDING",
        )
        db.add(bob_leave)

        db.commit()

        # Train ML Isolation Forest model
        print("Training ML IsolationForest model on clean seed records...")
        os.makedirs("./artifacts", exist_ok=True)
        training_dicts = [
            {
                "checkin_hour": 8,
                "worked_hours": float(r.worked_hours or 8.5),
                "day_of_week": r.local_date.weekday(),
            }
            for r in normal_records
        ]
        train_model(training_dicts)

        print("\n==========================================")
        print("[OK] Dayflow Database Seeded Successfully!")
        print("  - Total Employees: 5 (Clean & Focused)")
        print("  - HR Admin:    admin@dayflow.com  / Admin@1234")
        print("  - Alice Chen:  alice@dayflow.com  / Alice@1234")
        print("  - Bob Okafor:  bob@dayflow.com    / Bob@1234")
        print("  - Clara Vance: clara@dayflow.com  / Clara@1234")
        print("  - David Kim:   david@dayflow.com  / David@1234")
        print("==========================================\n")



    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
