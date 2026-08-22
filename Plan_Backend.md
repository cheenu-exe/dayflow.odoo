# Dayflow — Backend Plan
**Stack:** FastAPI · SQLAlchemy 2 · PostgreSQL 16 · Alembic · Argon2 · PyJWT

---

## What Already Exists

The core backend is scaffolded and partially functional. Do not rewrite it — extend it.

```
app/
├── main.py          ✅ FastAPI app, CORS, dashboard /me endpoint
├── config.py        ✅ Pydantic settings from .env
├── db.py            ✅ SQLAlchemy session + Base
├── deps.py          ✅ get_current_user, get_admin_user dependencies
├── security.py      ✅ JWT sign/verify, password hash (Argon2)
├── models.py        ✅ All ORM models defined (see below)
├── schemas.py       ✅ All Pydantic request/response schemas
├── routers/
│   ├── auth.py      ✅ POST /register, POST /login
│   ├── profiles.py  ✅ GET/PATCH /profiles/me
│   ├── attendance.py ✅ check-in, check-out, /me, /team, /alerts, passkey stub
│   ├── leave.py     ✅ submit, my requests, approval queue, approve, reject, balances
│   └── payroll.py   ✅ salary structures CRUD + prorated payslip
├── services/
│   ├── domain.py    ✅ to_utc(), calculate_worked_hours(), calculate_prorated_payroll()
│   ├── ml_contract.py ✅ calculate_coverage_risk(), date_range() — contract for ML team
│   ├── anomaly.py   ✅ evaluate_attendance_rules() — rule-based, demo-safe
│   ├── events.py    ✅ publish_event() — in-process event bus stub
│   └── passkey.py   ⚠️  verify_passkey_assertion() — stub only, needs py_webauthn
```

**Existing DB models:** `Organization`, `Team`, `User`, `EmployeeProfile`, `AttendanceRecord`, `LeaveType`, `LeaveBalance`, `LeaveRequest`, `LeaveApprovalEvent`, `SalaryStructure`, `AnomalyAlert`

---

## What You Need to Build

### 1. Missing Routers & Endpoints

**Admin Dashboard** — add to `main.py` or new `routers/admin.py`:
```
GET /api/v1/dashboard/admin
```
Response shape (build the Pydantic schema):
```json
{
  "pending_leave_count": 4,
  "open_alerts_count": 3,
  "todays_team_checkins": 18,
  "leave_queue": [ ...LeaveRequestResponse ],
  "recent_alerts": [ ...AnomalyAlertResponse ]
}
```

**Employee Directory** (admin only) — add to `routers/profiles.py`:
```
GET /api/v1/profiles?team_id=&search=    → list[ProfileResponse]
```

**Leave Types** — add to `routers/leave.py`:
```
GET  /api/v1/leave/types                  → list of leave types for org
POST /api/v1/leave/types  (admin only)    → create leave type
```

**Seed leave balances** — when a leave request is approved, leave balance already deducts. But there's no endpoint to *create* initial balances. Add:
```
POST /api/v1/leave/balances  (admin only)  → create balance for an employee + year
```

---

### 2. Passkey Integration (`services/passkey.py`)
The stub exists. Fill it in using `py_webauthn`:
```python
# pip install py_webauthn (add to requirements.txt)
from webauthn import verify_authentication_response

def verify_passkey_assertion(user_id: str, credential: dict) -> None:
    # Load stored credential from DB (need a new PasskeyCredential model)
    # Call verify_authentication_response(...)
    # Raise HTTPException(401) on failure
```
You'll need a new `passkey_credentials` table:
- `id`, `user_id` (FK), `credential_id` (bytes, unique), `public_key` (bytes), `sign_count` (int)

And two new endpoints:
```
POST /api/v1/auth/passkey/register/begin   → returns WebAuthn options
POST /api/v1/auth/passkey/register/finish  → stores credential
POST /api/v1/auth/passkey/login/begin      → returns assertion options
POST /api/v1/auth/passkey/login/finish     → verifies + returns JWT
```

---

### 3. ML Team Contract — Do Not Break This
The ML team will replace `services/ml_contract.py::calculate_coverage_risk()` with a richer version. **The function signature must stay identical:**
```python
def calculate_coverage_risk(
    team_size: int,
    overlapping_leaves_by_day: Iterable[int],
    affected_dates: list[date]
) -> CoverageResult:
```
Do not change the `CoverageResult` dataclass fields. The leave router depends on this exact shape.

Similarly, `services/anomaly.py::evaluate_attendance_rules()` signature must stay:
```python
def evaluate_attendance_rules(
    check_in_local: datetime,
    worked_hours: Decimal | None
) -> tuple[bool, str | None, str]:  # (is_anomaly, reason, severity)
```

---

### 4. Missing Alembic Migration
Run `alembic revision --autogenerate -m "add passkey credentials"` after adding the passkey model. Ensure all migrations run cleanly with `alembic upgrade head`.

---

### 5. Environment Variables (`.env.example` is already correct)
```
DATABASE_URL=postgresql+psycopg2://dayflow:dayflow@localhost:5432/dayflow
JWT_SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_MINUTES=60
CORS_ORIGINS=http://localhost:5173
LEAVE_SLA_DAYS=3
MODEL_ARTIFACT_PATH=./artifacts/isolation_forest.joblib
```
`REDIS_URL` is in `.env.example` but **Redis is not required** for the current implementation. Remove it unless you add Celery later.

---

### 6. API Reference for the Frontend Team

All endpoints are at `http://localhost:8000/api/v1/`. Full interactive docs at `http://localhost:8000/docs`.

**Auth**
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/register` | None | Creates org + admin user |
| POST | `/auth/login` | None | Returns `{access_token, user}` |

**Profiles**
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/profiles/me` | Employee | Own profile |
| PATCH | `/profiles/me` | Employee | `full_name`, `phone`, `timezone` |
| GET | `/profiles?search=` | Admin | Employee directory |

**Attendance**
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/attendance/check-in` | Employee | Body: `{local_date, timezone, check_in_local, source}` |
| POST | `/attendance/{id}/check-out` | Employee | Body: `{check_out_local}` |
| GET | `/attendance/me?limit=60` | Employee | Last N records |
| GET | `/attendance/team?start_date=&end_date=&team_id=` | Admin | Heatmap data |
| GET | `/attendance/alerts?status_filter=OPEN` | Admin | Anomaly alerts |
| PATCH | `/attendance/alerts/{id}/resolve` | Admin | Mark resolved |

**Leave**
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/leave/requests` | Employee | Returns `coverage_risk` immediately |
| GET | `/leave/requests/me` | Employee | |
| GET | `/leave/requests?status_filter=PENDING` | Admin | Approval queue |
| POST | `/leave/requests/{id}/approve` | Admin | Uses `SELECT FOR UPDATE` — may return 409 |
| POST | `/leave/requests/{id}/reject` | Admin | |
| GET | `/leave/balances/me?year=` | Employee | |
| GET | `/leave/types` | Both | |

**Payroll**
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/payroll/me/payslip?month=2026-08-01` | Employee | Prorated automatically |
| GET | `/payroll/me/structures` | Employee | Salary history |
| POST | `/payroll/employees/{user_id}/structures` | Admin | Create new salary record |
| GET | `/payroll/employees/{user_id}/payslip?month=` | Admin | View any employee's slip |

**Dashboard**
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/dashboard/me` | Employee | `{today_attendance, upcoming_leave, open_anomalies, insight}` |
| GET | `/dashboard/admin` | Admin | **TO BUILD** |
