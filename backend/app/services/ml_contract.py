from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class CoverageResult:
    level: str
    staffing_ratio: float
    team_size: int
    affected_dates: list[date]
    message: str


def calculate_coverage_risk(team_size: int, overlapping_leaves_by_day: Iterable[int], affected_dates: list[date]) -> CoverageResult:
    """Stable synchronous contract consumed by the leave API.

    The ML/Intelligence team may replace this module with its richer implementation,
    but the request/response shape remains unchanged for the frontend.
    """
    if team_size <= 0:
        raise ValueError("team_size must be greater than zero")
    counts = list(overlapping_leaves_by_day)
    worst_ratio = min((team_size - count) / team_size for count in counts) if counts else 1.0
    if worst_ratio >= 0.6:
        level, message = "GREEN", "Coverage is safe for the requested dates."
    elif worst_ratio >= 0.4:
        level, message = "AMBER", "Coverage is workable but may need manager attention."
    else:
        level, message = "RED", "Critical coverage risk: too many team members would be away."
    return CoverageResult(level, round(worst_ratio, 4), team_size, affected_dates, message)


def date_range(start: date, end: date) -> list[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]
