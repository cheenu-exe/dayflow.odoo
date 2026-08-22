import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusTag } from "@/components/StatusTag";
import { dayflowApi, AnomalyAlert } from "@/lib/api";
import { AlertOctagon, AlertTriangle, CheckCircle2, Clock, Filter, Flame, RefreshCw, ShieldAlert, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

export default function AdminAlertInbox() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "RESOLVED" | "ALL">("OPEN");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function loadAlerts() {
    try {
      setLoading(true);
      const res = await dayflowApi.anomalyAlerts(statusFilter === "ALL" ? "" : statusFilter);
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load anomaly alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [statusFilter]);

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    try {
      await dayflowApi.resolveAlert(alertId);
      toast.success("Alert resolved and archived!");
      loadAlerts();
    } catch (err: any) {
      toast.error("Failed to resolve alert", { description: err?.response?.data?.detail });
    } finally {
      setResolvingId(null);
    }
  }

  const highCount = alerts.filter((a) => a.severity === "HIGH" && a.status === "OPEN").length;
  const mediumCount = alerts.filter((a) => a.severity === "MEDIUM" && a.status === "OPEN").length;
  const resolvedCount = alerts.filter((a) => a.status === "RESOLVED").length;

  return (
    <AppShell role="admin">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#c85a3a]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Machine Learning Intelligence
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Anomaly Alert Inbox</h1>
          <p className="text-xs text-ink/60">
            Automated workplace irregularities flagged by Scikit-Learn IsolationForest inference engine.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-xs hover:border-verdant hover:text-verdant"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Inbox
        </button>
      </div>

      {/* Summary KPI Bar */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border border-red-200/80 bg-red-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">High Severity Alerts</span>
            <Flame className="h-4 w-4 text-red-600 animate-pulse" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-red-800">{highCount}</p>
          <p className="mt-1 text-[11px] text-red-600/80">Extended shifts &gt;14 hrs, abnormal durations</p>
        </div>

        <div className="rounded-[22px] border border-amber-200/80 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">Medium Severity Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-amber-800">{mediumCount}</p>
          <p className="mt-1 text-[11px] text-amber-700/80">Late check-ins, weekend shifts</p>
        </div>

        <div className="rounded-[22px] border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">Resolved &amp; Closed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-emerald-800">{resolvedCount}</p>
          <p className="mt-1 text-[11px] text-emerald-700/80">Acknowledged by operations team</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex rounded-full border border-ink/10 bg-white p-1 shadow-xs">
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              statusFilter === "OPEN" ? "bg-[#20211f] text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            Open Alerts ({highCount + mediumCount})
          </button>
          <button
            onClick={() => setStatusFilter("RESOLVED")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              statusFilter === "RESOLVED" ? "bg-[#20211f] text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              statusFilter === "ALL" ? "bg-[#20211f] text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            All Logs
          </button>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-[26px] border border-ink/10 bg-white p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
            Scanning Isolation Forest anomaly inbox...
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-ink/20 bg-white p-12 text-center text-sm text-ink/50">
            ✓ No anomaly alerts matching the selected filter.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-[24px] border bg-white p-5 shadow-xs transition hover:shadow-md ${
                alert.severity === "HIGH" ? "border-red-200" : "border-ink/10"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    alert.severity === "HIGH"
                      ? "bg-red-100 text-red-700"
                      : alert.severity === "MEDIUM"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-ink/5 text-ink/70"
                  }`}
                >
                  {alert.severity === "HIGH" ? <Flame className="h-5 w-5" /> : <AlertOctagon className="h-5 w-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] ${
                        alert.severity === "HIGH"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {alert.severity} Severity
                    </span>
                    <span className="text-[11px] font-mono text-ink/40">
                      Score: {alert.score ? Number(alert.score).toFixed(4) : "Rule-Engine"}
                    </span>
                  </div>

                  <h3 className="mt-1 font-display text-base font-bold text-ink">{alert.reason}</h3>
                  <p className="mt-1 text-xs text-ink/55">
                    Shift date: <strong className="text-ink">{alert.attendance?.local_date || "Recent"}</strong> · Check-in:{" "}
                    {alert.attendance?.check_in_utc ? new Date(alert.attendance.check_in_utc).toLocaleTimeString() : "—"}
                    {alert.attendance?.worked_hours && ` · Duration: ${alert.attendance.worked_hours} hrs`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {alert.status === "OPEN" ? (
                  <button
                    type="button"
                    disabled={resolvingId === alert.id}
                    onClick={() => handleResolve(alert.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0b6b57] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e] active:scale-[0.97] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {resolvingId === alert.id ? "Resolving..." : "Mark as Resolved"}
                  </button>
                ) : (
                  <StatusTag label="RESOLVED" tone="green" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
