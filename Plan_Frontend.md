# Dayflow — Frontend Plan
**Stack:** React 18 · Vite · Tailwind CSS · shadcn/ui · Recharts · Axios · React Router v6

---

## Context: What the Backend Provides

The backend is a FastAPI app running at `http://localhost:8000`. All endpoints are under `/api/v1/`. The full interactive schema is at `http://localhost:8000/docs`.

**Auth:** JWT Bearer token. Store in `localStorage` or memory. Attach as `Authorization: Bearer <token>` header on every request.

**Two roles exist:** `EMPLOYEE` and `HR_ADMIN`. Your app must render completely different experiences for each.

**Key data shapes to know:**
```typescript
// Attendance check-in — what you send
{ local_date: "2026-08-22", timezone: "Asia/Kolkata", check_in_local: "2026-08-22T09:00:00+05:30", source: "WEB" }

// Coverage risk — returned when employee submits leave
{ level: "RED" | "AMBER" | "GREEN", staffing_ratio: 0.33, team_size: 5, message: "Critical coverage risk..." }

// Payslip — returned from /payroll/me/payslip?month=2026-08-01
{ days_in_month: 31, eligible_days: 16, proration_factor: "0.5161", basic_prorated: "25806.45", gross_prorated: "32258.06" }

// Anomaly alert
{ id, severity: "HIGH"|"MEDIUM"|"LOW", reason: "Worked hours exceed 14 hours.", status: "OPEN"|"RESOLVED" }
```

---

## Project Setup

```bash
npm create vite@latest dayflow-frontend -- --template react
cd dayflow-frontend
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init        # choose: Default style, slate base colour, CSS variables YES
npm install axios react-router-dom recharts date-fns
```

Configure Axios base URL in `src/api/client.js`:
```js
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1" });
client.interceptors.request.use(cfg => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
```

---

## Design System — Do This First

Before building any page, define your design tokens in `tailwind.config.js` and `src/index.css`. The UI must look premium and dense, not empty.

**Colour palette (dark-mode first):**
- Background: `#0f1117` (near-black)
- Surface: `#1a1d27` (cards)
- Border: `#2a2d3a`
- Accent: `#6c63ff` (indigo-violet)
- Success / Green: `#22c55e`
- Warning / Amber: `#f59e0b`
- Danger / Red: `#ef4444`
- Text primary: `#f1f5f9`
- Text muted: `#64748b`

**Typography:** Import `Inter` from Google Fonts. Set as the default font.

**Status badge colours are mandatory everywhere:**
- `PENDING` → amber pill
- `APPROVED` → green pill  
- `REJECTED` → red pill
- `OPEN` (alert) → red pill with pulsing dot
- `GREEN` / `AMBER` / `RED` coverage risk → coloured badge with icon

---

## Pages & Components to Build

### Shared Components (build these first, reuse everywhere)
| Component | Purpose |
|-----------|---------|
| `<StatusBadge status={} />` | Colour-coded pill for all status values |
| `<CoverageRiskBadge risk={} />` | Large coloured badge with icon + ratio for leave requests |
| `<DataTable columns={} data={} />` | Sortable, filterable table with loading skeleton |
| `<SkeletonCard />` | Animated grey skeleton for loading states |
| `<EmptyState icon title message />` | Illustrated empty state — never show a blank white area |
| `<MetricCard label value subtitle icon />` | KPI card with an icon and a subtle sparkline or ring |

---

### Route: `/login`
Standard email + password form. On success, store the JWT, read `user.role`, and redirect to `/dashboard` or `/admin`.

---

### Route: `/dashboard` (Employee)

This is the employee's home. Make it feel **dense and alive** — not a blank screen.

**Layout:** Two-column grid on desktop. Left = main content. Right = sticky "Today" sidebar.

**Left column — build these sections:**

1. **Quick Stats Row** — 3 `<MetricCard>` components side by side:
   - "Check-in Status" — shows today's check-in time or a CTA button if not checked in yet
   - "Leave Balance" — radial ring showing `used / entitled` days (use Recharts `RadialBarChart`)
   - "Anomaly Alerts" — count badge; red if `> 0`

2. **Attendance History** — a 30-day mini heatmap grid (7 columns × ~4 rows). Each cell is a small coloured square: green = checked in, grey = no record, red = anomaly. Pull data from `GET /attendance/me?limit=30`. This is the most visually impactful element — do not skip it.

3. **Leave Requests Table** — `<DataTable>` of the employee's own leave requests from `GET /leave/requests/me`. Show status badge, dates, type, and a "Cancel" button for PENDING ones.

4. **Apply for Leave Button** → opens a modal/drawer with a date range picker, leave type dropdown (from `GET /leave/types`), and a reason text area. On submit, **immediately show the `<CoverageRiskBadge>`** returned in the response. If RED, show a warning before confirming. Do not silently discard this field.

**Right sidebar — "Today":**
- Current date and time (live, using `setInterval`)
- Check-in button (WEB source) → `POST /attendance/check-in` with `new Date().toISOString()` and `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Check-out button (appears only if checked in today)
- Upcoming leave cards (from `/dashboard/me → upcoming_leave`)
- Insight text (from `/dashboard/me → insight`)

---

### Route: `/admin` (HR Admin)

The admin dashboard is the product's centrepiece. It must look like a live operations room.

**Layout:** Sidebar navigation + main content area.

**Page: Overview**

Top row — 4 `<MetricCard>` components:
- Today's total check-ins
- Pending leave requests (with a red badge if `> 0`)
- Open anomaly alerts (red if `> 0`)
- Employees currently on leave

Below — two panels side by side:
- **Attendance Heatmap** (left, 60%): Pull from `GET /attendance/team?start_date=&end_date=`. Render a grid of `employee × day` cells. Cell colour = green (checked in), amber (half day), red (anomaly), grey (no record). Use Recharts or a CSS grid. This is the most important visual on the admin side.
- **Pending Leave Queue** (right, 40%): The top 5 pending requests. Each row shows employee name, dates, leave type, and the `<CoverageRiskBadge>`. Approve/Reject buttons. Handle `409 Conflict` gracefully: show a toast "Another admin already acted on this request."

**Page: Employees**

A searchable, filterable grid of all employees (from `GET /profiles?search=`). Each card shows:
- Avatar circle with initials (no blank grey circles — use coloured backgrounds based on name hash)
- Full name, job title, team
- A small status dot: green = checked in today, grey = not yet, amber = on leave

Clicking a card opens a right-side drawer with the full employee detail: profile, attendance history, leave history, and current payslip.

**Page: Alerts (Anomaly Inbox)**

A full-page list from `GET /attendance/alerts`. Each row:
- Severity badge (HIGH = red, MEDIUM = amber)
- Human-readable reason (e.g., "Worked hours exceed 14 hours")
- Timestamp + employee name
- "Resolve" button → `PATCH /attendance/alerts/{id}/resolve`

Do not just show a table — add a summary bar at the top: "3 HIGH · 5 MEDIUM · 2 resolved this week"

---

## Timezone Handling — Critical

**Always send the user's local timezone to the backend.** Use this in every attendance request:
```js
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "America/New_York"
const check_in_local = new Date().toISOString(); // ISO string with offset
```
Never send a hardcoded timezone. Never assume UTC on the frontend.

---

## Empty States & Loading States — Mandatory

Every list or table must have three states:
1. **Loading:** Show `<SkeletonCard />` placeholders (animated grey bars). Never show a blank white area.
2. **Empty:** Show a friendly `<EmptyState>` with an icon and message (e.g., "No leave requests yet — you're all clear ✓")
3. **Error:** Show a toast notification with the error message from the API response.

---

## File Structure

```
src/
├── api/
│   ├── client.js          # Axios instance with JWT interceptor
│   ├── auth.js            # login(), register()
│   ├── attendance.js      # checkIn(), checkOut(), myAttendance(), teamAttendance(), alerts()
│   ├── leave.js           # submitLeave(), myLeaves(), approvalQueue(), approve(), reject(), balances()
│   └── payroll.js         # myPayslip(), employeePayslip()
├── components/
│   ├── StatusBadge.jsx
│   ├── CoverageRiskBadge.jsx
│   ├── DataTable.jsx
│   ├── MetricCard.jsx
│   ├── SkeletonCard.jsx
│   ├── EmptyState.jsx
│   └── AttendanceHeatmap.jsx
├── pages/
│   ├── Login.jsx
│   ├── employee/
│   │   ├── Dashboard.jsx
│   │   ├── Attendance.jsx
│   │   ├── Leave.jsx
│   │   └── Payslip.jsx
│   └── admin/
│       ├── Overview.jsx
│       ├── Employees.jsx
│       └── Alerts.jsx
├── hooks/
│   ├── useAuth.js         # reads token, decodes role, provides logout
│   └── useTimezone.js     # returns Intl.DateTimeFormat().resolvedOptions().timeZone
├── App.jsx                # Routes + auth guard
└── main.jsx
```
