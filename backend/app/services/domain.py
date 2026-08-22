from calendar import monthrange
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from app.models import SalaryStructure


def to_utc(local_timestamp: datetime, iana_timezone: str) -> datetime:
    """Convert a browser-provided local timestamp to an aware UTC timestamp."""
    try:
        zone = ZoneInfo(iana_timezone)
    except Exception as exc:
        raise ValueError(f"Invalid IANA timezone: {iana_timezone}") from exc
    localized = local_timestamp.replace(tzinfo=zone) if local_timestamp.tzinfo is None else local_timestamp.astimezone(zone)
    return localized.astimezone(timezone.utc)


def calculate_worked_hours(check_in_utc: datetime, check_out_utc: datetime) -> Decimal:
    # SQLite test fixtures may return timezone-naive values; persisted production
    # values are timestamptz and are always interpreted as UTC when naive.
    if check_in_utc.tzinfo is None:
        check_in_utc = check_in_utc.replace(tzinfo=timezone.utc)
    if check_out_utc.tzinfo is None:
        check_out_utc = check_out_utc.replace(tzinfo=timezone.utc)
    seconds = (check_out_utc - check_in_utc).total_seconds()
    if seconds < 0:
        raise ValueError("check-out must be after check-in")
    return (Decimal(str(seconds / 3600)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calculate_prorated_payroll(employee_join_date: date, month: date, salary: SalaryStructure) -> dict[str, object]:
    """Prorate every salary component by eligible calendar days in the month.

    A join date on or before the first day receives the full month. A join date
    after the month's final day receives zero. This uses calendar-day proration,
    so a join date on day 15 of a 30-day month receives 16/30 days inclusive.
    """
    days_in_month = monthrange(month.year, month.month)[1]
    month_start = date(month.year, month.month, 1)
    month_end = date(month.year, month.month, days_in_month)
    eligible_start = max(employee_join_date, month_start)
    eligible_days = 0 if eligible_start > month_end else (month_end - eligible_start).days + 1
    exact_factor = Decimal(eligible_days) / Decimal(days_in_month)
    factor = exact_factor.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

    def prorate(value: Decimal) -> Decimal:
        return (value * exact_factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    basic = prorate(salary.basic_monthly)
    housing = prorate(salary.housing_monthly)
    transport = prorate(salary.transport_monthly)
    return {
        "days_in_month": days_in_month,
        "eligible_days": eligible_days,
        "proration_factor": factor,
        "basic_prorated": basic,
        "housing_prorated": housing,
        "transport_prorated": transport,
        "gross_prorated": basic + housing + transport,
    }
