# Dayflow — ML & Intelligence Plan
**Stack:** Python · scikit-learn · pandas · joblib (all in `requirements.txt`)

---

## Where You Fit

The backend has stubs for both intelligence features. You replace those stubs with real implementations. The function signatures are locked contracts — you must not change them.

You work entirely within `app/services/`. No new tables, no new routes.

---

## Contract 1: Coverage Risk (`services/ml_contract.py`)

Already wired into leave submission and approval. Verify the threshold logic is correct, optionally enrich the `message` field.

**Signature (frozen — do not change):**
```python
@dataclass(frozen=True)
class CoverageResult:
    level: str           # "GREEN" | "AMBER" | "RED"
    staffing_ratio: float
    team_size: int
    affected_dates: list[date]
    message: str

def calculate_coverage_risk(
    team_size: int,
    overlapping_leaves_by_day: Iterable[int],
    affected_dates: list[date]
) -> CoverageResult: ...
```

**Thresholds:** worst daily ratio `>= 0.6` → GREEN, `0.4–0.6` → AMBER, `< 0.4` → RED.

**Optionally enrich:** list the specific worst-affected dates in `message` (e.g., "Sept 3–4 are critically understaffed").

---

## Contract 2: Anomaly Detection (`services/anomaly.py`)

Called on every check-in and check-out. Must not block the HTTP request.

**Signature (frozen):**
```python
def evaluate_attendance_rules(
    check_in_local: datetime,
    worked_hours: Decimal | None,
) -> tuple[bool, str | None, str]:
    # (is_anomaly, human_readable_reason, severity "HIGH"|"MEDIUM"|"LOW")
```

**Current rules (already working — keep them):**
- `worked_hours > 14` → HIGH
- `worked_hours < 1` → MEDIUM
- `check_in_local.hour > 10` → MEDIUM
- `check_in_local.weekday() >= 5` → MEDIUM

**Add: IsolationForest layer** — create `services/ml_anomaly.py`:

```python
import joblib, pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest

MODEL_PATH = Path("./artifacts/isolation_forest.joblib")

def train_model(records: list[dict]) -> None:
    """Train on normal records. records have keys: checkin_hour, worked_hours, day_of_week"""
    df = pd.DataFrame(records)[["checkin_hour", "worked_hours", "day_of_week"]]
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(df)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

def predict_anomaly(checkin_hour: int, worked_hours: float, day_of_week: int) -> tuple[bool, float]:
    """Returns (is_anomaly, score). Fails safe if model file missing."""
    if not MODEL_PATH.exists():
        return False, 0.0
    model = joblib.load(MODEL_PATH)
    score = model.score_samples([[checkin_hour, worked_hours, day_of_week]])[0]
    return score < -0.1, float(score)
```

Then update `services/anomaly.py` to call ML after rules:
```python
# After existing rules pass, add:
from app.services.ml_anomaly import predict_anomaly
is_ml, score = predict_anomaly(check_in_local.hour, float(worked_hours or 0), check_in_local.weekday())
if is_ml:
    return True, f"ML model flagged an unusual attendance pattern.", "MEDIUM"
return False, None, "LOW"
```

---

## Seed-Time Training

The seed script will call your `train_model()` with 57 days of clean records, then inject 3 anomalous records (14-hr shift, 2 PM check-in, weekend). The model is trained on "normal" so the injected outliers score poorly and appear in the admin alert inbox.

```python
# seed.py will do:
from app.services.ml_anomaly import train_model
train_model(normal_records)  # called before anomalous records are inserted
```

---

## Deliverables
- [ ] `services/ml_anomaly.py` — `train_model()` and `predict_anomaly()`
- [ ] `services/anomaly.py` — updated with ML layer appended after rules
- [ ] `services/ml_contract.py` — verify thresholds, enrich `message` if time allows
- [ ] `artifacts/` dir exists and `.joblib` is in `.gitignore`
- [ ] `tests/test_anomaly.py` — each rule fires correctly; ML layer fails safely when no model file exists
