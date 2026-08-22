from datetime import datetime
from decimal import Decimal

from app.services.ml_anomaly import predict_anomaly


def evaluate_attendance_rules(check_in_local: datetime, worked_hours: Decimal | None) -> tuple[bool, str | None, str]:
    """Return deterministic demo-safe anomaly status, reason, and severity."""
    # 1. Rule layer — always runs, guaranteed demo-safe
    if worked_hours is not None and worked_hours > Decimal("14"):
        return True, "Worked hours exceed 14 hours.", "HIGH"
    if worked_hours is not None and worked_hours < Decimal("1"):
        return True, "Worked hours are below one hour.", "MEDIUM"
    if check_in_local.hour > 10 or (check_in_local.hour == 10 and check_in_local.minute > 0):
        return True, "Check-in time is later than 10:00 AM without a leave adjustment.", "MEDIUM"
    if check_in_local.weekday() >= 5:
        return True, "Weekend check-in detected.", "MEDIUM"

    # 2. ML layer — runs if model exists, flags statistical outliers
    is_ml_anomaly, score = predict_anomaly(
        checkin_hour=check_in_local.hour,
        worked_hours=float(worked_hours or 0),
        day_of_week=check_in_local.weekday(),
    )
    if is_ml_anomaly:
        return True, f"ML model flagged an unusual attendance pattern (score: {score:.3f}).", "MEDIUM"

    return False, None, "LOW"
