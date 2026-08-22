"""Initial Dayflow schema.

Revision ID: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("organizations", sa.Column("id", sa.String(36), primary_key=True), sa.Column("name", sa.String(160), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("teams", sa.Column("id", sa.String(36), primary_key=True), sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(120), nullable=False))
    op.create_index("ix_teams_organization_id", "teams", ["organization_id"])
    op.create_table("users", sa.Column("id", sa.String(36), primary_key=True), sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False), sa.Column("email", sa.String(320), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("role", sa.String(30), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("email"))
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table("employee_profiles", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("team_id", sa.String(36), sa.ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False), sa.Column("full_name", sa.String(160), nullable=False), sa.Column("job_title", sa.String(160), nullable=False), sa.Column("join_date", sa.Date(), nullable=False), sa.Column("timezone", sa.String(64), nullable=False), sa.Column("phone", sa.String(40)), sa.UniqueConstraint("user_id"))
    op.create_index("ix_employee_profiles_team_id", "employee_profiles", ["team_id"])
    op.create_table("leave_types", sa.Column("id", sa.String(36), primary_key=True), sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(80), nullable=False), sa.Column("annual_days", sa.Numeric(6, 2), nullable=False))
    op.create_index("ix_leave_types_organization_id", "leave_types", ["organization_id"])
    op.create_table("attendance_records", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("local_date", sa.Date(), nullable=False), sa.Column("timezone", sa.String(64), nullable=False), sa.Column("check_in_utc", sa.DateTime(timezone=True), nullable=False), sa.Column("check_out_utc", sa.DateTime(timezone=True)), sa.Column("worked_hours", sa.Numeric(6, 2)), sa.Column("source", sa.String(30), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("user_id", "local_date", name="uq_attendance_user_date"))
    op.create_index("ix_attendance_records_user_id", "attendance_records", ["user_id"])
    op.create_index("ix_attendance_records_local_date", "attendance_records", ["local_date"])
    op.create_table("leave_balances", sa.Column("id", sa.String(36), primary_key=True), sa.Column("employee_id", sa.String(36), sa.ForeignKey("employee_profiles.id", ondelete="CASCADE"), nullable=False), sa.Column("leave_type_id", sa.String(36), sa.ForeignKey("leave_types.id", ondelete="CASCADE"), nullable=False), sa.Column("year", sa.Integer(), nullable=False), sa.Column("entitled", sa.Numeric(6, 2), nullable=False), sa.Column("used", sa.Numeric(6, 2), nullable=False), sa.UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_leave_balance"))
    op.create_index("ix_leave_balances_employee_id", "leave_balances", ["employee_id"])
    op.create_index("ix_leave_balances_leave_type_id", "leave_balances", ["leave_type_id"])
    op.create_table("leave_requests", sa.Column("id", sa.String(36), primary_key=True), sa.Column("employee_id", sa.String(36), sa.ForeignKey("employee_profiles.id", ondelete="CASCADE"), nullable=False), sa.Column("leave_type_id", sa.String(36), sa.ForeignKey("leave_types.id", ondelete="RESTRICT"), nullable=False), sa.Column("start_date", sa.Date(), nullable=False), sa.Column("end_date", sa.Date(), nullable=False), sa.Column("days", sa.Numeric(6, 2), nullable=False), sa.Column("reason", sa.Text()), sa.Column("status", sa.String(30), nullable=False), sa.Column("current_approver_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_leave_requests_employee_id", "leave_requests", ["employee_id"])
    op.create_index("ix_leave_requests_status", "leave_requests", ["status"])
    op.create_table("leave_approval_events", sa.Column("id", sa.String(36), primary_key=True), sa.Column("leave_request_id", sa.String(36), sa.ForeignKey("leave_requests.id", ondelete="CASCADE"), nullable=False), sa.Column("actor_id", sa.String(36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("from_status", sa.String(30)), sa.Column("to_status", sa.String(30), nullable=False), sa.Column("note", sa.Text()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_leave_approval_events_leave_request_id", "leave_approval_events", ["leave_request_id"])
    op.create_table("salary_structures", sa.Column("id", sa.String(36), primary_key=True), sa.Column("employee_id", sa.String(36), sa.ForeignKey("employee_profiles.id", ondelete="CASCADE"), nullable=False), sa.Column("effective_from", sa.Date(), nullable=False), sa.Column("basic_monthly", sa.Numeric(12, 2), nullable=False), sa.Column("housing_monthly", sa.Numeric(12, 2), nullable=False), sa.Column("transport_monthly", sa.Numeric(12, 2), nullable=False))
    op.create_index("ix_salary_structures_employee_id", "salary_structures", ["employee_id"])
    op.create_table("anomaly_alerts", sa.Column("id", sa.String(36), primary_key=True), sa.Column("attendance_id", sa.String(36), sa.ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False), sa.Column("severity", sa.String(20), nullable=False), sa.Column("reason", sa.Text(), nullable=False), sa.Column("score", sa.Numeric(8, 4)), sa.Column("status", sa.String(20), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("attendance_id"))
    op.create_index("ix_anomaly_alerts_status", "anomaly_alerts", ["status"])


def downgrade() -> None:
    op.drop_table("anomaly_alerts")
    op.drop_index("ix_salary_structures_employee_id", table_name="salary_structures")
    op.drop_table("salary_structures")
    op.drop_index("ix_leave_approval_events_leave_request_id", table_name="leave_approval_events")
    op.drop_table("leave_approval_events")
    op.drop_index("ix_leave_requests_status", table_name="leave_requests")
    op.drop_index("ix_leave_requests_employee_id", table_name="leave_requests")
    op.drop_table("leave_requests")
    op.drop_index("ix_leave_balances_leave_type_id", table_name="leave_balances")
    op.drop_index("ix_leave_balances_employee_id", table_name="leave_balances")
    op.drop_table("leave_balances")
    op.drop_index("ix_attendance_records_local_date", table_name="attendance_records")
    op.drop_index("ix_attendance_records_user_id", table_name="attendance_records")
    op.drop_table("attendance_records")
    op.drop_index("ix_leave_types_organization_id", table_name="leave_types")
    op.drop_table("leave_types")
    op.drop_index("ix_employee_profiles_team_id", table_name="employee_profiles")
    op.drop_table("employee_profiles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_teams_organization_id", table_name="teams")
    op.drop_table("teams")
    op.drop_table("organizations")
