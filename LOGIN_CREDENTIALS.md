# 🔑 Dayflow HRMS — Login Credentials & Demo Accounts

All accounts are pre-seeded and ready for live presentation and testing.

---

## 🌐 Application URLs

- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: SQLite / PostgreSQL compatible (`dayflow.db`)

---

## 👥 Curated Demo Accounts

| Role | Name | Email | Password | Department / Scenario |
|---|---|---|---|---|
| **HR Operations Admin** | Sarah Jenkins | `admin@dayflow.com` | `Admin@1234` | **Full Admin Desk**: Health Monitor, Leave Approvals with ML Risk, ML Anomaly Inbox, People Directory, Payroll Governance, HR Analytics. |
| **Senior Engineering Lead** | Alice Chen | `alice@dayflow.com` | `Alice@1234` | **Lead Employee Desk**: Daily check-in/out, 17 days leave balance, Weekly Timesheet view, Document Vault. |
| **Mid-Month Joiner** | Bob Okafor | `bob@dayflow.com` | `Bob@1234` | **Payroll Proration Demo**: Joined on August 15 ($17/31 = 0.5484$ proration factor), 1-click PDF Pay Slip download. |
| **People Specialist** | Clara Vance | `clara@dayflow.com` | `Clara@1234` | **ML Anomaly Demo (Late Arrival)**: London timezone, flagged for check-in after 10:00 AM in the Alert Inbox. |
| **DevOps Lead** | David Kim | `david@dayflow.com` | `David@1234` | **ML Overtime & Staffing Risk Demo**: Flagged for 14.5h shift; concurrent leave application triggers **RED ML Staffing Risk**. |

---

## 🎯 Recommended Presentation Scenarios

### 1. Employee Check-in & Timesheet Flow
- **Login**: `alice@dayflow.com` / `Alice@1234`
- **Actions**:
  1. Click **Check In Now** on the Today Pulse card.
  2. Open **My Attendance** to show the **Weekly Timesheet (Mon–Sun)** with shift states (`Present`, `Half-day`, `Absent`, `On Leave`).
  3. Open **My Payslip** to inspect itemized salary statements and click **Print / Save PDF**.

### 2. ML Staffing Risk Evaluation
- **Login**: `alice@dayflow.com` or `david@dayflow.com`
- **Actions**:
  1. Go to **Time Away (Leave)** $\rightarrow$ click **Apply for Time Off**.
  2. Pick overlapping dates with team members.
  3. Observe the real-time **RED / AMBER Staffing Coverage Risk Badge**.

### 3. HR Admin Operations & Anomaly Resolution
- **Login**: `admin@dayflow.com` / `Admin@1234`
- **Actions**:
  1. Inspect the **Health Monitor & Matrix** on the admin dashboard.
  2. Go to **Approval Desk** to approve/reject leave requests with transactional row locking.
  3. Go to **Alert Inbox (ML)** to review **IsolationForest** anomaly scores and click **Mark as Resolved**.
  4. Open **HR Analytics** for Recharts visualizations of attendance velocity and payroll distribution.
  5. Go to **People Directory** and click **+ Onboard New Employee** to provision a new hire.

### 4. Dayflow AI Copilot
- **Action**: Click the floating chat bubble at the bottom right.
- **Example Prompts**:
  - *"What is my leave balance?"*
  - *"How do I apply for leave?"*
  - *"How is mid-month payroll prorated?"*
