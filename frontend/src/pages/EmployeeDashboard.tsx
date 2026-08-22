import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Flame,
  LogOut,
  MapPin,
  Plus,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatusTag } from "@/components/StatusTag";
import { CoverageRiskBadge } from "@/components/CoverageRiskBadge";
import { dayflowApi, AttendanceRecord, LeaveRequest, LeaveBalance, DashboardMeResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

export default function EmployeeDashboard() {
  const { profile, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardMeResponse | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  // Check-in action loading
  const [actionLoading, setActionLoading] = useState(false);

  // Apply Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [lastCreatedLeave, setLastCreatedLeave] = useState<LeaveRequest | null>(null);

  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTimeStr(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date())
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [dashRes, attRes, balRes, typesRes] = await Promise.all([
        dayflowApi.dashboard().catch(() => ({ data: null })),
        dayflowApi.myAttendance().catch(() => ({ data: [] })),
        dayflowApi.myBalances().catch(() => ({ data: [] })),
        dayflowApi.listLeaveTypes().catch(() => ({ data: [] })),
      ]);

      if (dashRes.data) {
        setDashboardData(dashRes.data);
        if (dashRes.data.today_attendance) {
          setTodayAttendance(dashRes.data.today_attendance);
        }
      }

      setAttendanceList(attRes.data || []);
      setBalances(balRes.data || []);
      setLeaveTypes(typesRes.data || []);
      if (typesRes.data && typesRes.data.length > 0) {
        setSelectedLeaveTypeId(typesRes.data[0].id);
      }
    } catch (err) {
      console.error("Error loading employee dashboard data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      const now = new Date();
      const localDate = now.toISOString().split("T")[0];
      const res = await dayflowApi.checkIn({
        local_date: localDate,
        timezone: localZone,
        check_in_local: now.toISOString(),
        source: "WEB",
      });
      setTodayAttendance(res.data);
      toast.success("Checked in successfully!", {
        description: `Check-in logged at ${now.toLocaleTimeString()} (${localZone})`,
      });
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Check-in failed.";
      toast.error("Check-in error", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!todayAttendance) return;
    setActionLoading(true);
    try {
      const now = new Date();
      const res = await dayflowApi.checkOut(todayAttendance.id, now.toISOString());
      setTodayAttendance(res.data);
      toast.success("Checked out successfully!", {
        description: `Worked hours: ${res.data.worked_hours ?? "—"} hrs recorded.`,
      });
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Check-out failed.";
      toast.error("Check-out error", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApplyLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate || !selectedLeaveTypeId) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmittingLeave(true);
    try {
      const res = await dayflowApi.submitLeave({
        leave_type_id: selectedLeaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || "Personal time off",
      });
      setLastCreatedLeave(res.data);
      toast.success("Leave request submitted!", {
        description: `Risk Level: ${res.data.coverage_risk?.level ?? "NORMAL"}`,
      });
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to submit leave.";
      toast.error("Leave submission failed", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setSubmittingLeave(false);
    }
  }

  const primaryBalance = balances[0] || { entitled: 20, used: 0, remaining: 20 };
  const balanceRatio = primaryBalance.entitled > 0 ? (primaryBalance.used / primaryBalance.entitled) * 100 : 0;

  return (
    <AppShell role="employee">
      {/* Top Hero Banner */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.75fr)]">
        <div className="relative overflow-hidden rounded-[30px] bg-[#20211f] p-7 text-white shadow-xl sm:p-9">
          {/* Decorative geometric patterns */}
          <div className="absolute right-0 top-0 h-full w-1/2 pointer-events-none opacity-10">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="2" fill="none" strokeDasharray="6 6" />
              <circle cx="100" cy="100" r="50" stroke="white" strokeWidth="3" fill="none" />
              <circle cx="100" cy="100" r="20" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#34d399]"></span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#a8e6d5]">
                Live Workforce Pulse
              </span>
            </div>

            <h1 className="mt-4 font-display text-4xl leading-[1.04] tracking-[-0.05em] sm:text-5xl">
              Hello, {profile?.full_name?.split(" ")[0] || "Alice"}.<br />
              <span className="text-[#a8e6d5]">Your day is running in rhythm.</span>
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {dashboardData?.insight || "Your attendance is within regular parameters. Daily check-in maintains live team coverage accuracy."}
            </p>

            {/* Check-In / Check-Out Interactive Controls */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {!todayAttendance ? (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-extrabold text-[#20211f] shadow-md transition hover:bg-[#a8e6d5] active:scale-[0.97] disabled:opacity-50"
                >
                  <Fingerprint className="h-4 w-4 text-[#0b6b57]" />
                  {actionLoading ? "Logging Check-In..." : `Check In Now (${currentTimeStr})`}
                </button>
              ) : todayAttendance.check_out_utc ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-5 py-3 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Day Completed · {todayAttendance.worked_hours} hrs worked
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0b6b57] px-4 py-2.5 text-xs font-bold text-white shadow-sm">
                    <Check className="h-4 w-4 text-[#a8e6d5]" />
                    Checked in at {new Date(todayAttendance.check_in_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-[#20211f] transition hover:bg-red-50 hover:text-red-700 active:scale-[0.97] disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {actionLoading ? "Checking Out..." : "Check Out"}
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowLeaveModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/20 active:scale-[0.97]"
              >
                <Plus className="h-3.5 w-3.5" /> Apply for Time Off
              </button>
            </div>
          </div>
        </div>

        {/* Right Metric Card: Working Rhythm & Timezone */}
        <div className="flex flex-col justify-between rounded-[30px] border border-ink/10 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/40">Working Rhythm</p>
                <h2 className="mt-1 font-display text-2xl tracking-[-0.04em]">Live Snapshot</h2>
              </div>
              <StatusTag label="Synchronized" tone="green" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-ink/8 pb-3">
                <span className="text-xs text-ink/60">Live Local Time</span>
                <span className="font-mono text-sm font-bold text-ink">{currentTimeStr}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ink/8 pb-3">
                <span className="text-xs text-ink/60">Timezone Context</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b6b57]">
                  <MapPin className="h-3 w-3" /> {localZone}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-ink/8 pb-3">
                <span className="text-xs text-ink/60">Assigned Team</span>
                <span className="text-xs font-bold text-ink">{profile?.team?.name || "Engineering"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/60">Open Anomaly Alerts</span>
                <span className={`text-xs font-bold ${dashboardData?.open_anomalies ? "text-red-600" : "text-emerald-700"}`}>
                  {dashboardData?.open_anomalies ? `${dashboardData.open_anomalies} Anomaly Alert(s)` : "Clean (0)"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#f7f5ef] p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/50">
              Prorated Payroll & Attendance Active
            </p>
          </div>
        </div>
      </section>

      {/* Middle Row: 3 Quick Metric Cards */}
      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        {/* Card 1: Leave Balance Ring */}
        <div className="rounded-[26px] border border-ink/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/45">Annual Leave Balance</span>
            <Calendar className="h-4 w-4 text-[#0b6b57]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tracking-tight text-ink">
              {primaryBalance.remaining ?? 20}
            </span>
            <span className="text-xs text-ink/50">days left / {primaryBalance.entitled ?? 20} entitled</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-[#0b6b57] transition-all duration-500"
              style={{ width: `${Math.min(100, balanceRatio)}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-bold text-ink/40">
            <span>{primaryBalance.used ?? 0} Used</span>
            <span>{primaryBalance.remaining ?? 20} Available</span>
          </div>
        </div>

        {/* Card 2: 30-Day Attendance Health */}
        <div className="rounded-[26px] border border-ink/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/45">Attendance Logs</span>
            <Clock3 className="h-4 w-4 text-[#d79a2b]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tracking-tight text-ink">
              {attendanceList.length}
            </span>
            <span className="text-xs text-ink/50">shifts recorded</span>
          </div>
          <p className="mt-4 text-xs text-ink/60">
            {attendanceList.length > 0
              ? `Last shift: ${attendanceList[0].local_date} (${attendanceList[0].worked_hours ?? "8.75"} hrs)`
              : "No recent records logged"}
          </p>
          <div className="mt-3">
            <Link href="/employee/attendance" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b6b57] hover:underline">
              View Attendance History <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Upcoming Time Off */}
        <div className="rounded-[26px] border border-ink/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/45">Upcoming Leave</span>
            <CalendarClock className="h-4 w-4 text-[#c85a3a]" />
          </div>
          <div className="mt-4">
            {dashboardData?.upcoming_leave && dashboardData.upcoming_leave.length > 0 ? (
              <div>
                <p className="font-display text-xl font-bold text-ink">
                  {dashboardData.upcoming_leave[0].start_date} to {dashboardData.upcoming_leave[0].end_date}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusTag
                    label={dashboardData.upcoming_leave[0].status}
                    tone={dashboardData.upcoming_leave[0].status === "APPROVED" ? "green" : "amber"}
                  />
                  <span className="text-xs text-ink/60">{dashboardData.upcoming_leave[0].days} day(s)</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-ink">No upcoming leaves scheduled</p>
                <p className="mt-1 text-xs text-ink/50">Apply ahead to allow smart capacity balancing.</p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <Link href="/employee/leave" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b6b57] hover:underline">
              Manage Time Off <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom Section: 30-day mini attendance heatmap & Recent Shift Ledger */}
      <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,0.75fr)]">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-1 rounded-full bg-[#0b6b57]" />
              <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
                Recent Attendance Ledger
              </h2>
            </div>
            <Link href="/employee/attendance" className="text-xs font-bold text-[#0b6b57] hover:underline">
              Full History →
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
            {attendanceList.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink/50">
                No attendance records yet. Click "Check In Now" above to start!
              </div>
            ) : (
              <div className="divide-y divide-ink/8">
                {attendanceList.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 hover:bg-[#f7f5ef]/50">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        <Check className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{record.local_date}</p>
                        <p className="text-xs text-ink/50">
                          In: {new Date(record.check_in_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {record.check_out_utc && ` · Out: ${new Date(record.check_out_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-ink">
                        {record.worked_hours ? `${record.worked_hours} hrs` : "In Progress"}
                      </span>
                      <StatusTag
                        label={record.worked_hours ? "Completed" : "Checked In"}
                        tone={record.worked_hours ? "green" : "amber"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Payslip Peek */}
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full bg-[#0b6b57]" />
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
              Compensation & Payslip
            </h2>
          </div>

          <div className="mt-4 rounded-[26px] border border-ink/10 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink/50">Current Period</span>
              <span className="rounded-full bg-verdant/10 px-2.5 py-0.5 text-[10px] font-bold text-verdant">Active</span>
            </div>
            <h3 className="mt-2 font-display text-xl font-bold">Deterministic Proration</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink/60">
              Dayflow dynamically calculates inclusive calendar day proration for mid-month joiners and regular periods.
            </p>
            <div className="mt-5 border-t border-ink/8 pt-4">
              <Link
                href="/employee/payroll"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b6b57] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#084d3e]"
              >
                Inspect Prorated Payslip <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[28px] border border-ink/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-verdant/10 text-verdant">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Apply for Time Off</h3>
                  <p className="text-[11px] text-ink/50">Evaluated in real-time with ML Staffing Risk</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  setLastCreatedLeave(null);
                }}
                className="rounded-full p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {lastCreatedLeave ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" /> Request Submitted Successfully
                  </div>
                  <p className="mt-1.5 text-xs">
                    Your request from {lastCreatedLeave.start_date} to {lastCreatedLeave.end_date} has been placed in the approval queue.
                  </p>
                </div>

                {lastCreatedLeave.coverage_risk && (
                  <div className="rounded-2xl border border-ink/10 bg-[#f7f5ef] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/50">
                      Live ML Staffing Coverage Feedback
                    </p>
                    <div className="mt-2">
                      <CoverageRiskBadge risk={lastCreatedLeave.coverage_risk} />
                    </div>
                    <p className="mt-2 text-xs text-ink/70">
                      {lastCreatedLeave.coverage_risk.message}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveModal(false);
                    setLastCreatedLeave(null);
                  }}
                  className="w-full rounded-full bg-[#0b6b57] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#084d3e]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyLeave} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                    Leave Type
                  </label>
                  <select
                    value={selectedLeaveTypeId}
                    onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  >
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.annual_days} days/year)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                    Reason / Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide details for manager approval..."
                    className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 rounded-full border border-ink/15 py-2.5 text-xs font-bold text-ink/70 hover:bg-ink/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLeave}
                    className="flex-1 rounded-full bg-[#0b6b57] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#084d3e] disabled:opacity-50"
                  >
                    {submittingLeave ? "Evaluating..." : "Submit Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
