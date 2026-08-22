import joblib
import pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest

MODEL_PATH = Path("./artifacts/isolation_forest.joblib")


def train_model(records: list[dict]) -> None:
    """Train and persist the IsolationForest model.
    
    records: list of dicts with keys:
        checkin_hour (int), worked_hours (float), day_of_week (int 0-6)
    """
    if not records:
        return
    df = pd.DataFrame(records)[["checkin_hour", "worked_hours", "day_of_week"]]
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(df)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)


def predict_anomaly(checkin_hour: int, worked_hours: float, day_of_week: int) -> tuple[bool, float]:
    """Returns (is_anomaly, score). Fails safe if model file missing."""
    if not MODEL_PATH.exists():
        return False, 0.0
    try:
        model = joblib.load(MODEL_PATH)
        score = float(model.score_samples([[checkin_hour, worked_hours, day_of_week]])[0])
        return score < -0.1, score
    except Exception:
        return False, 0.0
