# Dayflow Backend Core API

This directory contains the **Plan 2 backend only**: a FastAPI modular monolith for authentication, profiles, attendance, leave, payroll, anomaly alerts, and employee dashboard data. It is deliberately organized as a shared application rather than separate microservices so the Frontend, Background Jobs, ML Intelligence, and Infrastructure plans can integrate against one stable process and one database schema.

## Run locally

Create a virtual environment, install dependencies, copy `.env.example` to `.env`, and point `DATABASE_URL` at the PostgreSQL service from the infrastructure plan.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The OpenAPI contract is available at `http://localhost:8000/docs`, and the readiness endpoint is `GET /health`. The production container runs migrations and Gunicorn with Uvicorn workers; the infrastructure plan can place it behind Render or Railway and set `CORS_ORIGINS` to the deployed Vite origin.

## Domain modules

| Module | Responsibility | Frontend consumers | Cross-plan boundary |
|---|---|---|---|
| `auth` | Registration, JWT login, current-user lookup, Argon2 password hashes | Login, register, protected routes | JWT bearer token in Axios interceptor |
| `profiles` | Employee profile, team directory, admin edits | Profile and drill-down views | Organization-scoped rows |
| `attendance` | UTC check-in/out, IANA timezone snapshot, alerts | Today panel, history, heatmap, Alert Inbox | Synchronous rule adapter and domain events |
| `leave` | Request lifecycle, balances, approval queue, coverage risk | Leave form, funnel, risk badge | Synchronous coverage function and approval events |
| `payroll` | Salary structures and deterministic proration | Payslip and admin drill-down | Salary data consumed by demo seed and frontend |
| `dashboard` | Employee summary and deterministic insight | Employee dashboard | Read-only composition over domain tables |

## API contract

All application routes are under `/api/v1`. Protected endpoints require `Authorization: Bearer <access_token>`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Creates an organization, General team, HR admin, annual leave type, and initial balance |
| `POST` | `/auth/login` | Public | Returns JWT plus user summary |
| `GET` | `/auth/me` | Any authenticated user | Returns the signed-in user |
| `GET/PATCH` | `/profiles/me` | Employee | Read or update personal fields; team changes remain admin-only |
| `GET` | `/profiles` | Admin | Organization-scoped employee directory |
| `PATCH` | `/profiles/{user_id}` | Admin | Update any employee profile in the same organization |
| `POST` | `/attendance/check-in` | Employee | Stores exact UTC timestamp plus local date and IANA timezone snapshot |
| `POST` | `/attendance/{attendance_id}/check-out` | Owner | Stores UTC checkout and calculates worked hours |
| `POST` | `/attendance/passkey/check-in` | Employee | Stable passkey source contract; cryptographic assertion verification is injected by Plan 4 before persistence |
| `GET` | `/attendance/me` | Employee | Returns up to 180 recent records |
| `GET/PATCH` | `/attendance/alerts`, `/attendance/alerts/{id}/resolve` | Admin | Alert Inbox read and resolve operations |
| `POST` | `/leave/requests` | Employee | Creates a pending request and returns `GREEN`, `AMBER`, or `RED` coverage risk |
| `GET` | `/leave/requests/me` | Employee | Returns the employee's leave history |
| `GET` | `/leave/requests` | Admin | Approval queue with recalculated risk badges |
| `POST` | `/leave/requests/{id}/approve` | Admin | Locks request and balance in one transaction, then emits `leave_approved` |
| `POST` | `/leave/requests/{id}/reject` | Admin | Records a rejection and audit event |
| `GET` | `/leave/balances/me` | Employee | Returns entitlement, used, and computed remaining days |
| `POST` | `/payroll/employees/{user_id}/structures` | Admin | Adds an effective-dated salary structure |
| `GET` | `/payroll/me/structures` | Employee | Returns personal salary structures |
| `GET` | `/payroll/me/payslip?month=YYYY-MM-01` | Employee | Calculates deterministic prorated payslip |
| `GET` | `/payroll/employees/{user_id}/payslip?month=YYYY-MM-01` | Admin | Admin drill-down payslip |
| `GET` | `/dashboard/me` | Employee | Composes today attendance, upcoming leave, anomaly count, and insight |

## Important implementation guarantees

### Concurrency-safe leave approval

The approval handler locks the leave request and the matching yearly balance with SQLAlchemy `with_for_update()` inside one transaction. It rejects duplicate decisions with `409 Conflict`, rejects insufficient remaining balance with `409 Conflict`, increments `used`, changes the state to `APPROVED`, and writes a `leave_approval_events` row. The frontend should refresh the queue after either success or `409`.

### UTC storage and timezone display

The browser sends `local_date`, a browser-local `check_in_local` timestamp, and an IANA timezone such as `America/New_York`. The backend stores `check_in_utc` and the timezone snapshot. Checkout is converted using the stored timezone, and worked hours are calculated from UTC values. This preserves the actual instant while allowing the frontend to display local time.

### Payroll proration

Proration uses inclusive calendar days. For example, a join date of August 15 in a 31-day month produces 17 eligible days and a displayed factor of `0.5484`; monetary components are calculated from the exact `17 / 31` ratio and rounded to cents. A join date on day 15 in a 30-day month therefore produces exactly 16/30 of the monthly component under the inclusive-day convention.

### ML and Background Jobs integration

`app/services/ml_contract.py` is the synchronous contract for the Intelligence plan. The leave API passes team size, per-day approved overlap counts including the request under evaluation, and affected dates to `calculate_coverage_risk()`. The contract returns a typed result with level, ratio, team size, dates, and human-readable message.

`app/services/anomaly.py` supplies deterministic demo-safe rules for late, weekend, very short, and very long attendance records. The Intelligence plan can enrich this with IsolationForest scores without changing the API schema. The `AnomalyAlert.score` column is reserved for that model score.

`app/services/events.py` exposes `publish_event()`. The current local implementation logs events without blocking an HTTP response. The Background Jobs plan can replace that one function with Celery/Redis publishing for `leave_approved` and `anomaly_detected`, and can independently schedule model retraining and SLA scans.

## Migrations and tests

The initial Alembic revision is `0001_initial`. Run migrations with `alembic upgrade head` and roll back with `alembic downgrade -1`. The test suite uses SQLite only as a fast isolated test database; production remains PostgreSQL 16.

```bash
pytest -q
```

The current suite covers JWT login, timezone conversion, duplicate attendance protection, anomaly creation, coverage thresholds, leave approval balance spending, and August mid-month payroll proration.

## Ownership boundaries

This implementation intentionally does **not** include the React frontend, the worker scheduler, Redis service, Docker Compose orchestration, demo seed data, or the full WebAuthn cryptographic implementation. Those belong to Plans 1, 3, 5, and the Intelligence team's passkey module respectively. The backend provides the routes, tables, dependency contracts, event boundary, and environment hooks those plans need to plug in without redesigning the API.
