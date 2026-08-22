import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  Eye,
  Flame,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UsersRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatusTag } from "@/components/StatusTag";
import { CoverageRiskBadge } from "@/components/CoverageRiskBadge";
import { dayflowApi, DashboardAdminResponse, AttendanceRecord, LeaveRequest, AnomalyAlert } from "@/lib/api";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState<DashboardAdminResponse | null>(null);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadAdminData() {
    try {
      setLoading(true);
      const [dashRes, teamAttRes] = await Promise.all([
        dayflowApi.adminDashboard().catch(() => ({ data: null })),
        dayflowApi.teamAttendance().catch(() => ({ data: [] })),
      ]);

      if (dashRes.data) {
        setDashData(dashRes.data);
      }
      setTeamAttendance(teamAttRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admin overview data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleApprove(reqId: string) {
    setActionLoadingId(reqId);
    try {
      await dayflowApi.approveLeave(reqId, "Approved by Admin");
      toast.success("Leave request approved!", {
        description: "Balances spent and audit event committed.",
      });
      loadAdminData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Approval conflict or error.";
      toast.error("Action failed", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(reqId: string) {
    setActionLoadingId(reqId);
    try {
      await dayflowApi.rejectLeave(reqId, "Declined by Admin due to coverage requirements");
      toast.info("Leave request rejected");
      loadAdminData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Rejection error.";
      toast.error("Action failed", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResolveAlert(alertId: string) {
    setActionLoadingId(alertId);
    try {
      await dayflowApi.resolveAlert(alertId);
      toast.success("Alert resolved successfully!");
      loadAdminData();
    } catch (err: any) {
      toast.error("Failed to resolve alert");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <AppShell role="admin">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Operations Control Center
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Health Monitor & Dispatch</h1>
          <p className="text-xs text-ink/60">
            Real-time workforce synchronization, ML anomaly alerts, and concurrency-safe leave dispatch.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-xs hover:border-verdant hover:text-verdant"
        >
          Refresh Overview
        </button>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[24px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Total Headcount</span>
            <UsersRound className="h-4 w-4 text-[#0b6b57]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink">
            {dashData?.total_employees ?? 25}
          </p>
          <p className="mt-1 text-[11px] text-ink/50">Across Engineering, Sales & HR</p>
        </div>

        <div className="rounded-[24px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Today's Check-Ins</span>
            <CheckCircle2 className="h-4 w-4 text-[#0b6b57]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink">
            {dashData?.todays_team_checkins ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">Logged in today</p>
        </div>

        <div className="rounded-[24px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Pending Leaves</span>
            <Clock className="h-4 w-4 text-[#d79a2b]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-[#b47a16]">
            {dashData?.pending_leave_count ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-ink/50">Awaiting manager decision</p>
        </div>

        <div className="rounded-[24px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Open Anomaly Alerts</span>
            <ShieldAlert className="h-4 w-4 text-[#c85a3a]" />
          </div>
          <p className={`mt-3 font-display text-3xl font-bold ${dashData?.open_alerts_count ? "text-[#c85a3a]" : "text-emerald-700"}`}>
            {dashData?.open_alerts_count ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-ink/50">Flagged by ML Isolation Forest</p>
        </div>
      </div>

      {/* Main Row: Team Attendance Feed & Pending Approval Desk Queue */}
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        {/* Left Column: Organization Live Attendance Matrix */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-1 rounded-full bg-[#0b6b57]" />
              <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
                Organization Attendance Matrix
              </h2>
            </div>
            <span className="text-xs text-ink/50 font-bold">{teamAttendance.length} records</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
                Loading team attendance feed...
              </div>
            ) : teamAttendance.length === 0 ? (
              <div className="p-10 text-center text-sm text-ink/50">
                No recent team attendance records logged.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ink/8 bg-[#f7f5ef] text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/50">
                    <tr>
                      <th className="py-3 px-5">Employee / Team</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">In Time</th>
                      <th className="py-3 px-4">Out Time</th>
                      <th className="py-3 px-4">Worked</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/8 font-medium text-ink/80">
                    {teamAttendance.slice(0, 8).map((rec) => (
                      <tr key={rec.id} className="transition hover:bg-[#f7f5ef]/40">
                        <td className="py-3 px-5">
                          <p className="font-bold text-ink">{rec.user?.profile?.full_name || rec.user?.email || "Employee"}</p>
                          <p className="text-[10.5px] text-ink/50">{rec.user?.profile?.team?.name || "General"} · {rec.timezone}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-ink">{rec.local_date}</td>
                        <td className="py-3 px-4 font-mono">
                          {new Date(rec.check_in_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {rec.check_out_utc
                            ? new Date(rec.check_out_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 font-bold text-ink">{rec.worked_hours ?? "—"} hrs</td>
                        <td className="py-3 px-5">
                          <StatusTag
                            label={rec.worked_hours ? "Complete" : "In Progress"}
                            tone={rec.worked_hours ? "green" : "amber"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Approvals & Quick Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-1 rounded-full bg-[#d79a2b]" />
                <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
                  Approval Desk Queue
                </h2>
              </div>
              <Link href="/admin/leave" className="text-xs font-bold text-[#0b6b57] hover:underline">
                View All →
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
              {dashData?.leave_queue && dashData.leave_queue.length > 0 ? (
                <div className="divide-y divide-ink/8">
                  {dashData.leave_queue.slice(0, 4).map((req) => (
                    <div key={req.id} className="p-4 space-y-2.5 hover:bg-[#f7f5ef]/40">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-ink">
                            {req.employee?.full_name || "Employee"} ({req.days} days)
                          </p>
                          <p className="text-[11px] text-ink/50">
                            {req.start_date} → {req.end_date} · {req.reason || "Time off"}
                          </p>
                        </div>
                        <CoverageRiskBadge risk={req.coverage_risk} />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={actionLoadingId === req.id}
                          onClick={() => handleReject(req.id)}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === req.id}
                          onClick={() => handleApprove(req.id)}
                          className="rounded-full bg-[#0b6b57] px-3.5 py-1 text-[11px] font-bold text-white hover:bg-[#084d3e] disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-ink/50">
                  ✓ No pending leave requests in queue.
                </div>
              )}
            </div>
          </div>

          {/* Recent Anomaly Alerts Peek */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-1 rounded-full bg-[#c85a3a]" />
                <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
                  ML Anomaly Alerts
                </h2>
              </div>
              <Link href="/admin/alerts" className="text-xs font-bold text-[#0b6b57] hover:underline">
                Alert Inbox →
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
              {dashData?.recent_alerts && dashData.recent_alerts.length > 0 ? (
                <div className="divide-y divide-ink/8">
                  {dashData.recent_alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="p-4 space-y-2 hover:bg-[#f7f5ef]/40">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              alert.severity === "HIGH"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {alert.severity} Severity
                          </span>
                          <p className="mt-1 text-xs font-bold text-ink">{alert.reason}</p>
                          <p className="text-[10px] text-ink/50">
                            {alert.attendance?.user?.profile?.full_name || "Employee"} · Shift: {alert.attendance?.local_date}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResolveAlert(alert.id)}
                          className="rounded-full border border-ink/15 bg-white px-2.5 py-1 text-[10px] font-bold text-ink hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-ink/50">
                  ✓ All anomaly alerts resolved.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
