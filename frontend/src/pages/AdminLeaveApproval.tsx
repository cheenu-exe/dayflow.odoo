import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusTag } from "@/components/StatusTag";
import { CoverageRiskBadge } from "@/components/CoverageRiskBadge";
import { dayflowApi, LeaveRequest, LeaveType } from "@/lib/api";
import {
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminLeaveApproval() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Decision Modal State
  const [activeModal, setActiveModal] = useState<{ req: LeaveRequest; type: "approve" | "reject" } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  // Create Leave Type Modal
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDays, setNewTypeDays] = useState("20");

  async function loadData() {
    try {
      setLoading(true);
      const [qRes, tRes] = await Promise.all([
        dayflowApi.approvalQueue().catch(() => ({ data: [] })),
        dayflowApi.listLeaveTypes().catch(() => ({ data: [] })),
      ]);
      setRequests(qRes.data || []);
      setLeaveTypes(tRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load approval queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDecisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeModal) return;
    setProcessing(true);
    try {
      if (activeModal.type === "approve") {
        await dayflowApi.approveLeave(activeModal.req.id, decisionNote || "Approved by Admin");
        toast.success("Leave approved!", {
          description: "Balance deducted and leave status set to APPROVED.",
        });
      } else {
        await dayflowApi.rejectLeave(activeModal.req.id, decisionNote || "Rejected by Admin");
        toast.info("Leave request rejected.");
      }
      setActiveModal(null);
      setDecisionNote("");
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Decision error.";
      toast.error("Action failed", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setProcessing(false);
    }
  }

  async function handleCreateLeaveType(e: React.FormEvent) {
    e.preventDefault();
    if (!newTypeName || !newTypeDays) return;
    try {
      await dayflowApi.createLeaveType({
        name: newTypeName,
        annual_days: Number(newTypeDays),
      });
      toast.success("New leave policy created successfully!");
      setShowCreateTypeModal(false);
      setNewTypeName("");
      setNewTypeDays("20");
      loadData();
    } catch (err: any) {
      toast.error("Failed to create leave policy", { description: err?.response?.data?.detail });
    }
  }

  async function handleDeleteLeaveType(typeId: string, name: string) {
    if (!confirm(`Are you sure you want to remove the leave policy "${name}"?`)) return;
    try {
      await dayflowApi.deleteLeaveType(typeId);
      toast.success("Leave policy deleted.");
      loadData();
    } catch (err: any) {
      toast.error("Delete failed", { description: err?.response?.data?.detail });
    }
  }

  const pendingList = requests.filter((r) => r.status === "PENDING");
  const decidedList = requests.filter((r) => r.status !== "PENDING");

  return (
    <AppShell role="admin">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Leave & Capacity Dispatch
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Leave Approval Desk</h1>
          <p className="text-xs text-ink/60">
            Concurrency-safe decision dispatch with transactional balance locks, admin comments, and policy management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateTypeModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0b6b57] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e] active:scale-[0.97]"
          >
            <Plus className="h-3.5 w-3.5" /> + New Leave Policy
          </button>
          <button
            onClick={loadData}
            className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-xs hover:border-verdant hover:text-verdant"
          >
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Leave Policy Management Strip */}
      <div className="mt-7 rounded-[26px] border border-ink/10 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-ink/8 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0b6b57]" />
            <h3 className="font-display text-sm font-bold text-ink">Organization Leave Policies</h3>
          </div>
          <span className="text-xs text-ink/40 font-bold">{leaveTypes.length} active policies</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {leaveTypes.map((lt) => (
            <div key={lt.id} className="flex items-center justify-between rounded-2xl bg-[#f7f5ef] p-3.5 text-xs">
              <div>
                <p className="font-bold text-ink">{lt.name}</p>
                <p className="text-[10.5px] text-ink/50">{lt.annual_days} days annual entitlement</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteLeaveType(lt.id, lt.name)}
                className="rounded-full p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
                title="Delete policy"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#d79a2b] animate-pulse" />
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
              Pending Decisions ({pendingList.length})
            </h2>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
              Loading approval requests...
            </div>
          ) : pendingList.length === 0 ? (
            <div className="p-10 text-center text-sm text-ink/50">
              ✓ No pending requests. All leave applications are up to date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-ink/8 bg-[#f7f5ef] text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/50">
                  <tr>
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-4">Period</th>
                    <th className="py-3.5 px-4">Days</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Reason / Notes</th>
                    <th className="py-3.5 px-4">ML Staffing Risk</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8 font-medium text-ink/80">
                  {pendingList.map((req) => (
                    <tr key={req.id} className="transition hover:bg-[#f7f5ef]/40">
                      <td className="py-4 px-6">
                        <p className="font-bold text-ink">{req.employee?.full_name || "Employee"}</p>
                        <p className="text-[10.5px] text-ink/50">{req.employee?.job_title} · {req.employee?.team?.name}</p>
                      </td>
                      <td className="py-4 px-4 font-bold text-ink">{req.start_date} → {req.end_date}</td>
                      <td className="py-4 px-4 font-bold text-ink">{req.days} d</td>
                      <td className="py-4 px-4">{req.leave_type?.name || "Annual"}</td>
                      <td className="py-4 px-4 text-ink/60">{req.reason || "—"}</td>
                      <td className="py-4 px-4">
                        <CoverageRiskBadge risk={req.coverage_risk} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModal({ req, type: "reject" });
                              setDecisionNote("");
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModal({ req, type: "approve" });
                              setDecisionNote("");
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-[#0b6b57] px-3.5 py-1 text-xs font-bold text-white hover:bg-[#084d3e]"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Historical Decisions Table */}
      {decidedList.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-ink/30" />
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/60">
              Resolved Decisions & Audit Ledger ({decidedList.length})
            </h2>
          </div>

          <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink/8 bg-[#f7f5ef] text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-6">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8 font-medium text-ink/80">
                {decidedList.map((req) => (
                  <tr key={req.id} className="hover:bg-[#f7f5ef]/40">
                    <td className="py-3.5 px-6 font-bold text-ink">{req.employee?.full_name || "Employee"}</td>
                    <td className="py-3.5 px-4 font-mono">{req.start_date} → {req.end_date}</td>
                    <td className="py-3.5 px-4">{req.days} d</td>
                    <td className="py-3.5 px-4">{req.leave_type?.name || "Annual"}</td>
                    <td className="py-3.5 px-6">
                      <StatusTag
                        label={req.status}
                        tone={req.status === "APPROVED" ? "green" : "red"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision Confirmation Modal with Admin Note */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-ink/10 bg-white p-6 shadow-2xl sm:p-8">
            <h3 className="font-display text-2xl font-bold">
              {activeModal.type === "approve" ? "Confirm Leave Approval" : "Reject Leave Request"}
            </h3>
            <p className="mt-1 text-xs text-ink/60">
              For {activeModal.req.employee?.full_name} ({activeModal.req.start_date} → {activeModal.req.end_date})
            </p>

            {activeModal.req.coverage_risk && (
              <div className="mt-4 rounded-xl bg-[#f7f5ef] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-ink/50">ML Coverage Risk</span>
                  <CoverageRiskBadge risk={activeModal.req.coverage_risk} />
                </div>
                <p className="mt-1.5 text-[11px] text-ink/70">{activeModal.req.coverage_risk.message}</p>
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                  Decision Comment / Reason (Audited)
                </label>
                <textarea
                  rows={2}
                  required
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder={activeModal.type === "approve" ? "Approved: Workload covered by team lead..." : "Declined: Peak quarterly sprint coverage..."}
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 rounded-full border border-ink/15 py-2.5 text-xs font-bold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`flex-1 rounded-full py-2.5 text-xs font-bold text-white shadow-xs ${
                    activeModal.type === "approve" ? "bg-[#0b6b57] hover:bg-[#084d3e]" : "bg-[#c85a3a] hover:bg-[#a64327]"
                  }`}
                >
                  {processing ? "Submitting..." : activeModal.type === "approve" ? "Approve & Spend Balance" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Leave Type Policy Modal */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-ink/10 bg-white p-6 shadow-2xl sm:p-8">
            <h3 className="font-display text-2xl font-bold">New Leave Policy</h3>
            <p className="mt-1 text-xs text-ink/60">Define organization-wide leave entitlement tier.</p>

            <form onSubmit={handleCreateLeaveType} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                  Policy Name
                </label>
                <input
                  type="text"
                  required
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Parental Leave, Sabbatical"
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                  Annual Days Entitlement
                </label>
                <input
                  type="number"
                  required
                  value={newTypeDays}
                  onChange={(e) => setNewTypeDays(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTypeModal(false)}
                  className="flex-1 rounded-full border border-ink/15 py-2.5 text-xs font-bold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-[#0b6b57] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e]"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
