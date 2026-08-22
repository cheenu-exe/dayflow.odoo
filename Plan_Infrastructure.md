# Dayflow — Infrastructure & Seed Plan
**Stack:** Docker · Docker Compose · PostgreSQL 16 · Alembic · Python seed script

---

## What You Own

1. The `docker-compose.yml` that all devs use locally
2. `alembic upgrade head` works cleanly
3. The demo seed script that populates 25 employees + dramatic data

Everything else (FastAPI backend, React frontend) is built by other teams and you wire them together.

---

## Docker Compose

The backend already has a `Dockerfile`. Create `docker-compose.yml` at the repo root:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dayflow
      POSTGRES_PASSWORD: dayflow
      POSTGRES_DB: dayflow
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./dayflow-backend
    env_file: ./dayflow-backend/.env
    environment:
      DATABASE_URL: postgresql+psycopg2://dayflow:dayflow@db:5432/dayflow
    ports:
      - "8000:8000"
    depends_on:
      - db
    command: >
      sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

  frontend:
    build: ./dayflow-frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8000/api/v1

volumes:
  pgdata:
```

**One command to run everything:** `docker-compose up`

---

## Seed Script (CRITICAL — The Demo Lives Here)

Create `dayflow-backend/seed.py`. This script:
1. Wipes and recreates all tables
2. Inserts exactly the data needed for the live demo
3. Trains the ML model on the clean data before injecting anomalies

**Run it:** `cd dayflow-backend && python seed.py`

### What to seed:

**Organization & Teams**
```python
org = Organization(name="Dayflow Corp")
engineering = Team(name="Engineering", organization=org)   # 10 members
sales = Team(name="Sales", organization=org)               # 8 members  
hr_team = Team(name="HR", organization=org)                # 5 members
# + 1 HR Admin account + 1 demo employee account
```

**Admin account**
```python
admin = User(email="admin@dayflow.com", role="HR_ADMIN", ...)
# Password: Admin@1234
```

**Demo employee (primary demo user)**
```python
alice = User(email="alice@dayflow.com", role="EMPLOYEE")
alice_profile = EmployeeProfile(
    full_name="Alice Chen",
    job_title="Senior Engineer",
    team=engineering,
    join_date=date.today() - timedelta(days=180),
    timezone="America/New_York",   # DST timezone — proves flex C
)
```

**Mid-month joiner (for payroll proration demo)**
```python
bob = User(email="bob@dayflow.com", role="EMPLOYEE")
bob_profile = EmployeeProfile(
    full_name="Bob Okafor",
    join_date=date.today().replace(day=15),  # joined on the 15th of this month
    timezone="Asia/Kolkata",
)
SalaryStructure(employee=bob_profile, effective_from=bob_profile.join_date,
    basic_monthly=50000, housing_monthly=10000, transport_monthly=5000)
# When the payslip endpoint is called for the current month,
# eligible_days = ~15, proration_factor ≈ 0.50, and the split is visible
```

**60 days of clean attendance for Alice**
```python
normal_records = []
for i in range(60, 3, -1):   # 60 days ago to 4 days ago
    day = date.today() - timedelta(days=i)
    if day.weekday() < 5:     # skip weekends
        checkin = datetime(day.year, day.month, day.day, 8, 30, 0)  # 8:30 AM — always normal
        checkout = datetime(day.year, day.month, day.day, 17, 15, 0)
        record = AttendanceRecord(user=alice, local_date=day, timezone="America/New_York",
            check_in_utc=to_utc(checkin, "America/New_York"),
            check_out_utc=to_utc(checkout, "America/New_York"),
            worked_hours=Decimal("8.75"))
        normal_records.append({"checkin_hour": 8, "worked_hours": 8.75, "day_of_week": day.weekday()})
        db.add(record)
db.commit()

# Train the ML model on clean data BEFORE inserting anomalies
from app.services.ml_anomaly import train_model
train_model(normal_records)
```

**3 injected anomalies (last 3 days — will appear in Alert Inbox)**
```python
# Anomaly 1: 14-hour shift (HIGH severity)
day = date.today() - timedelta(days=3)
AttendanceRecord(..., check_in_utc=to_utc(datetime(day, 7, 0), "America/New_York"),
    check_out_utc=to_utc(datetime(day, 21, 30), "America/New_York"),
    worked_hours=Decimal("14.5"))

# Anomaly 2: 2 PM check-in (late — MEDIUM severity)
day = date.today() - timedelta(days=2)
AttendanceRecord(..., check_in_utc=to_utc(datetime(day, 14, 0), "America/New_York"), ...)

# Anomaly 3: Weekend check-in
day = date.today() - timedelta(days=1)
# Pick a Saturday — adjust if today is not near weekend
```

**Conflicting leave requests (for coverage demo)**
```python
# Two Engineering team members already approved for next week
next_monday = date.today() + timedelta(days=(7 - date.today().weekday()))
for member in [eng_member_1, eng_member_2]:
    req = LeaveRequest(employee=member.profile, leave_type=paid_leave,
        start_date=next_monday, end_date=next_monday + timedelta(days=4),
        days=5, status="APPROVED")
    db.add(req)
    balance.used += 5  # deduct from balance
# Now when Alice (Engineering) applies for the same week → RED coverage risk fires
```

**Leave types and balances**
```python
paid = LeaveType(name="Paid Leave", annual_days=20, organization=org)
sick = LeaveType(name="Sick Leave", annual_days=10, organization=org)
unpaid = LeaveType(name="Unpaid Leave", annual_days=365, organization=org)

# Create balances for all employees
for emp_profile in all_profiles:
    db.add(LeaveBalance(employee=emp_profile, leave_type=paid, year=2026, entitled=20, used=0))
    db.add(LeaveBalance(employee=emp_profile, leave_type=sick, year=2026, entitled=10, used=0))
```

---

## Production Deployment Checklist

1. **Backend → Render.com:** Create a Web Service. Build command: `pip install -r requirements.txt`. Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Add env vars from `.env`.

2. **Database → Render PostgreSQL:** Create a managed DB. Copy the internal `DATABASE_URL` into the backend service env vars.

3. **Frontend → Vercel:** Import the `dayflow-frontend` directory. Set env var `VITE_API_URL=https://your-render-url.onrender.com/api/v1`. Vercel will auto-detect Vite and build it.

4. **CORS:** Update `CORS_ORIGINS` in the backend env to include the Vercel URL.

5. **Run seed on prod:** `python seed.py` against the production DATABASE_URL (set it in your local shell temporarily). Verify admin@dayflow.com logs in successfully.

---

## Demo Accounts (for the live presentation)

| Role | Email | Password |
|------|-------|----------|
| HR Admin | admin@dayflow.com | Admin@1234 |
| Employee (DST zone) | alice@dayflow.com | Alice@1234 |
| Mid-month joiner | bob@dayflow.com | Bob@1234 |
