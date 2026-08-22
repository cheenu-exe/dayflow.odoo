import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusTag } from "@/components/StatusTag";
import { CoverageRiskBadge } from "@/components/CoverageRiskBadge";
import { dayflowApi, LeaveBalance, LeaveRequest, LeaveType } from "@/lib/api";
import { Calendar, CheckCircle2, Flame, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeLeave() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Leave Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluatedResult, setEvaluatedResult] = useState<LeaveRequest | null>(null);

  async function loadLeaveData() {
    try {
      setLoading(true);
      const [balRes, reqRes, typesRes] = await Promise.all([
        dayflowApi.myBalances().catch(() => ({ data: [] })),
        dayflowApi.myLeave().catch(() => ({ data: [] })),
        dayflowApi.listLeaveTypes().catch(() => ({ data: [] })),
      ]);

      setBalances(balRes.data || []);
      setRequests(reqRes.data || []);
      setLeaveTypes(typesRes.data || []);
      if (typesRes.data && typesRes.data.length > 0) {
        setSelectedTypeId(typesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leave records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaveData();
  }, []);

  async function handleSubmitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate || !selectedTypeId) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await dayflowApi.submitLeave({
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || "Personal leave request",
      });
      setEvaluatedResult(res.data);
      toast.success("Leave request submitted for review!");
      loadLeaveData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Leave submission failed.";
      toast.error("Error submitting leave", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell role="employee">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Time Off & Capacity
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Time Away Management</h1>
          <p className="text-xs text-ink/60">
            Submit leave requests with real-time ML team coverage risk evaluation.
          </p>
        </div>

        <button
          onClick={() => {
            setEvaluatedResult(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#0b6b57] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#084d3e] active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" /> Apply for Time Off
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {balances.map((b) => (
          <div key={b.id} className="rounded-[24px] border border-ink/10 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink/50">{b.leave_type?.name || "Leave"}</span>
              <Calendar className="h-4 w-4 text-[#0b6b57]" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tracking-tight text-ink">{b.remaining}</span>
              <span className="text-xs text-ink/50">days available</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-ink/8 pt-3 text-xs text-ink/60">
              <span>Entitled: <strong className="text-ink">{b.entitled}</strong></span>
              <span>Used: <strong className="text-ink">{b.used}</strong></span>
            </div>
          </div>
        ))}
        {balances.length === 0 && (
          <div className="col-span-3 rounded-2xl border border-dashed border-ink/20 p-8 text-center text-xs text-ink/50">
            Loading leave balance allocations...
          </div>
        )}
      </div>

      {/* Leave History Table */}
      <div className="mt-9">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full bg-[#0b6b57]" />
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
              Leave Request History
            </h2>
          </div>
          <span className="text-xs text-ink/40 font-bold">{requests.length} total applications</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
              Loading leave requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-sm text-ink/50">
              No leave requests submitted yet. Click "Apply for Time Off" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-ink/8 bg-[#f7f5ef] text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/50">
                  <tr>
                    <th className="py-3.5 px-6">Date Range</th>
                    <th className="py-3.5 px-4">Days</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">ML Staffing Risk</th>
                    <th className="py-3.5 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8 font-medium text-ink/80">
                  {requests.map((req) => (
                    <tr key={req.id} className="transition hover:bg-[#f7f5ef]/40">
                      <td className="py-4 px-6 font-bold text-ink">
                        {req.start_date} → {req.end_date}
                      </td>
                      <td className="py-4 px-4 font-bold text-ink">{req.days} d</td>
                      <td className="py-4 px-4">{req.leave_type?.name || "Annual"}</td>
                      <td className="py-4 px-4 text-ink/60">{req.reason || "—"}</td>
                      <td className="py-4 px-4">
                        <CoverageRiskBadge risk={req.coverage_risk} />
                      </td>
                      <td className="py-4 px-6">
                        <StatusTag
                          label={req.status}
                          tone={
                            req.status === "APPROVED"
                              ? "green"
                              : req.status === "REJECTED"
                              ? "red"
                              : "amber"
                          }
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

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[28px] border border-ink/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-verdant/10 text-verdant">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Apply for Time Off</h3>
                  <p className="text-[11px] text-ink/50">Instant ML coverage calculation upon submission</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEvaluatedResult(null);
                }}
                className="rounded-full p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {evaluatedResult ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" /> Request Submitted to Approver Desk
                  </div>
                  <p className="mt-1.5 text-xs">
                    Requested {evaluatedResult.days} day(s) from {evaluatedResult.start_date} to {evaluatedResult.end_date}.
                  </p>
                </div>

                {evaluatedResult.coverage_risk && (
                  <div className="rounded-2xl border border-ink/10 bg-[#f7f5ef] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/50">
                        ML Staffing Risk Analysis
                      </p>
                      <CoverageRiskBadge risk={evaluatedResult.coverage_risk} />
                    </div>
                    <p className="mt-2 text-xs text-ink/70">
                      {evaluatedResult.coverage_risk.message}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEvaluatedResult(null);
                  }}
                  className="w-full rounded-full bg-[#0b6b57] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#084d3e]"
                >
                  Close & Return
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitLeave} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                    Leave Type
                  </label>
                  <select
                    value={selectedTypeId}
                    onChange={(e) => setSelectedTypeId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  >
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.annual_days} days/yr)
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
                    Reason
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide context for this leave..."
                    className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-full border border-ink/15 py-2.5 text-xs font-bold text-ink/70 hover:bg-ink/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-full bg-[#0b6b57] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#084d3e] disabled:opacity-50"
                  >
                    {submitting ? "Evaluating..." : "Submit & Evaluate Risk"}
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
