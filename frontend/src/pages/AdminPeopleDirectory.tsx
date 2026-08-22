import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusTag } from "@/components/StatusTag";
import { DocumentVault } from "@/components/DocumentVault";
import { dayflowApi, Profile, Payslip } from "@/lib/api";
import {
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Edit,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

function getInitials(name?: string) {
  if (!name) return "EM";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-emerald-600",
    "bg-teal-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function AdminPeopleDirectory() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL");

  // Slide-over Drawer State
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "payroll" | "structure" | "docs">("profile");

  // Edit Profile Form State
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [updating, setUpdating] = useState(false);

  // Employee Payslip State
  const [empPayslip, setEmpPayslip] = useState<Payslip | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  // Add Salary Structure Form
  const [basicRate, setBasicRate] = useState("50000");
  const [housingRate, setHousingRate] = useState("10000");
  const [transportRate, setTransportRate] = useState("5000");
  const [structureEffective, setStructureEffective] = useState(new Date().toISOString().split("T")[0]);
  const [savingStructure, setSavingStructure] = useState(false);

  // Onboard New Employee Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardName, setOnboardName] = useState("");
  const [onboardTitle, setOnboardTitle] = useState("");
  const [onboardTeamId, setOnboardTeamId] = useState("");
  const [onboardPhone, setOnboardPhone] = useState("");
  const [onboardSalary, setOnboardSalary] = useState("55000");
  const [onboarding, setOnboarding] = useState(false);

  async function loadProfiles() {
    try {
      setLoading(true);
      const res = await dayflowApi.listProfiles(search || undefined);
      setProfiles(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load directory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, [search]);

  function openEmployeeDrawer(prof: Profile) {
    setActiveProfile(prof);
    setEditName(prof.full_name);
    setEditTitle(prof.job_title);
    setEditPhone(prof.phone || "");
    setEditTimezone(prof.timezone || "America/New_York");
    setDrawerTab("profile");
    loadEmployeePayslip(prof.user_id);
  }

  async function loadEmployeePayslip(userId: string) {
    setPayslipLoading(true);
    try {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const res = await dayflowApi.employeePayslip(userId, monthStr);
      setEmpPayslip(res.data);
    } catch {
      setEmpPayslip(null);
    } finally {
      setPayslipLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProfile) return;
    setUpdating(true);
    try {
      const res = await dayflowApi.updateProfile(activeProfile.user_id, {
        full_name: editName,
        job_title: editTitle,
        phone: editPhone,
        timezone: editTimezone,
      });
      setActiveProfile(res.data);
      toast.success("Employee profile updated successfully!");
      loadProfiles();
    } catch (err: any) {
      toast.error("Update failed", { description: err?.response?.data?.detail });
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddStructure(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProfile) return;
    setSavingStructure(true);
    try {
      await dayflowApi.createStructure(activeProfile.user_id, {
        effective_from: structureEffective,
        basic_monthly: Number(basicRate),
        housing_monthly: Number(housingRate),
        transport_monthly: Number(transportRate),
      });
      toast.success("Salary structure registered!");
      setDrawerTab("payroll");
      loadEmployeePayslip(activeProfile.user_id);
    } catch (err: any) {
      toast.error("Failed to add structure", { description: err?.response?.data?.detail });
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteEmployee() {
    if (!activeProfile) return;
    if (!confirm(`Are you sure you want to remove ${activeProfile.full_name} from the organization?`)) {
      return;
    }
    try {
      await dayflowApi.deleteEmployee(activeProfile.user_id);
      toast.success("Employee record deleted.");
      setActiveProfile(null);
      loadProfiles();
    } catch (err: any) {
      toast.error("Delete failed", { description: err?.response?.data?.detail });
    }
  }

  async function handleOnboardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onboardEmail || !onboardName || !onboardTitle) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setOnboarding(true);
    try {
      await dayflowApi.onboardEmployee({
        email: onboardEmail,
        full_name: onboardName,
        job_title: onboardTitle,
        team_id: onboardTeamId || undefined,
        phone: onboardPhone || undefined,
        basic_monthly: Number(onboardSalary),
        housing_monthly: Number(onboardSalary) * 0.2,
        transport_monthly: Number(onboardSalary) * 0.1,
      });
      toast.success("New employee successfully onboarded!", {
        description: `Credentials generated for ${onboardEmail}.`,
      });
      setShowOnboardModal(false);
      setOnboardEmail("");
      setOnboardName("");
      setOnboardTitle("");
      setOnboardPhone("");
      loadProfiles();
    } catch (err: any) {
      toast.error("Onboarding failed", { description: err?.response?.data?.detail });
    } finally {
      setOnboarding(false);
    }
  }

  const filtered = profiles.filter((p) => {
    if (selectedTeam !== "ALL" && p.team?.name !== selectedTeam) return false;
    return true;
  });

  return (
    <AppShell role="admin">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Workforce Governance
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">People Directory</h1>
          <p className="text-xs text-ink/60">
            Search, inspect, onboard, and manage all employee records and compensation structures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOnboardModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0b6b57] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e] active:scale-[0.97]"
          >
            <UserPlus className="h-3.5 w-3.5" /> + Onboard New Employee
          </button>
          <button
            onClick={loadProfiles}
            className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-xs hover:border-verdant hover:text-verdant"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name or job title..."
            className="w-full rounded-full border border-ink/15 bg-white py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink/35 focus:border-[#0b6b57] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "Engineering", "Sales", "HR"].map((team) => (
            <button
              key={team}
              onClick={() => setSelectedTeam(team)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedTeam === team
                  ? "bg-[#20211f] text-white"
                  : "border border-ink/10 bg-white text-ink/60 hover:text-ink"
              }`}
            >
              {team === "ALL" ? "All Departments" : team}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full rounded-[26px] border border-ink/10 bg-white p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
            Loading people directory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-[26px] border border-dashed border-ink/20 bg-white p-12 text-center text-sm text-ink/50">
            No employees found matching the search criteria.
          </div>
        ) : (
          filtered.map((prof) => (
            <div
              key={prof.id}
              onClick={() => openEmployeeDrawer(prof)}
              className="group cursor-pointer rounded-[24px] border border-ink/10 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-verdant/40 hover:shadow-md"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white shadow-xs ${getAvatarColor(
                    prof.full_name
                  )}`}
                >
                  {getInitials(prof.full_name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="truncate font-display text-base font-bold text-ink group-hover:text-[#0b6b57]">
                      {prof.full_name}
                    </h3>
                    <ChevronRight className="h-4 w-4 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-[#0b6b57]" />
                  </div>
                  <p className="truncate text-xs font-semibold text-ink/70">{prof.job_title}</p>
                  <p className="mt-1 text-[11px] text-ink/45">
                    {prof.team?.name || "General"} · {prof.timezone}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-ink/8 pt-3 text-[11px] text-ink/50">
                <span>Joined: {prof.join_date}</span>
                <span className="font-semibold text-[#0b6b57]">Manage Profile →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-over Profile Drawer */}
      {activeProfile && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold text-white ${getAvatarColor(
                    activeProfile.full_name
                  )}`}
                >
                  {getInitials(activeProfile.full_name)}
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">{activeProfile.full_name}</h3>
                  <p className="text-xs text-ink/50">{activeProfile.job_title}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveProfile(null)}
                className="rounded-full p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="mt-6 flex rounded-xl border border-ink/10 bg-[#f7f5ef] p-1 text-[11px]">
              <button
                onClick={() => setDrawerTab("profile")}
                className={`flex-1 rounded-lg py-1.5 font-bold transition ${
                  drawerTab === "profile" ? "bg-white text-ink shadow-xs" : "text-ink/60"
                }`}
              >
                Edit Details
              </button>
              <button
                onClick={() => setDrawerTab("payroll")}
                className={`flex-1 rounded-lg py-1.5 font-bold transition ${
                  drawerTab === "payroll" ? "bg-white text-ink shadow-xs" : "text-ink/60"
                }`}
              >
                Live Payslip
              </button>
              <button
                onClick={() => setDrawerTab("structure")}
                className={`flex-1 rounded-lg py-1.5 font-bold transition ${
                  drawerTab === "structure" ? "bg-white text-ink shadow-xs" : "text-ink/60"
                }`}
              >
                + Structure
              </button>
              <button
                onClick={() => setDrawerTab("docs")}
                className={`flex-1 rounded-lg py-1.5 font-bold transition ${
                  drawerTab === "docs" ? "bg-white text-ink shadow-xs" : "text-ink/60"
                }`}
              >
                Docs Vault
              </button>
            </div>

            {/* Tab 1: Profile Edit */}
            {drawerTab === "profile" && (
              <div className="mt-6 space-y-5">
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                      Job Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                      Phone Contact
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1-555-0100"
                      className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                      Timezone
                    </label>
                    <input
                      type="text"
                      required
                      value={editTimezone}
                      onChange={(e) => setEditTimezone(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="w-full rounded-full bg-[#0b6b57] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e] disabled:opacity-50"
                    >
                      {updating ? "Saving Changes..." : "Save Profile Changes"}
                    </button>
                  </div>
                </form>

                {/* Delete Employee Danger Zone */}
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                  <h4 className="text-xs font-bold text-red-900">Danger Zone</h4>
                  <p className="mt-1 text-[11px] text-red-700">
                    Permanently delete this employee account, attendance logs, and associated salary structures.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteEmployee}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3.5 py-1.5 text-xs font-bold text-red-700 shadow-xs hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Employee Record
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Live Payslip */}
            {drawerTab === "payroll" && (
              <div className="mt-6 space-y-4">
                {payslipLoading ? (
                  <p className="text-xs text-ink/50 text-center py-8">Calculating employee payslip...</p>
                ) : !empPayslip ? (
                  <div className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-xs text-ink/50">
                    No active salary structure found for this employee. Click "+ Structure" to configure one.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-ink/10 bg-[#f7f5ef] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-ink/50">Period: {empPayslip.month}</span>
                      <span className="font-mono text-xs font-bold text-verdant">
                        Factor: {empPayslip.proration_factor}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-ink/8 pt-2.5">
                      <div className="flex justify-between">
                        <span className="text-ink/60">Basic Prorated</span>
                        <span className="font-mono font-bold">${Number(empPayslip.basic_prorated).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/60">Housing Prorated</span>
                        <span className="font-mono font-bold">${Number(empPayslip.housing_prorated).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/60">Transport Prorated</span>
                        <span className="font-mono font-bold">${Number(empPayslip.transport_prorated).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-ink/10 pt-2 text-sm font-bold text-[#0b6b57]">
                        <span>Gross Payout</span>
                        <span className="font-mono">${Number(empPayslip.gross_prorated).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Structure Config */}
            {drawerTab === "structure" && (
              <form onSubmit={handleAddStructure} className="mt-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                    Basic Monthly ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={basicRate}
                    onChange={(e) => setBasicRate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                    Housing Allowance ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={housingRate}
                    onChange={(e) => setHousingRate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                    Transport Allowance ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={transportRate}
                    onChange={(e) => setTransportRate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/60">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={structureEffective}
                    onChange={(e) => setStructureEffective(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingStructure}
                    className="w-full rounded-full bg-[#0b6b57] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e] disabled:opacity-50"
                  >
                    {savingStructure ? "Saving Structure..." : "Register Salary Structure"}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 4: Document Vault */}
            {drawerTab === "docs" && (
              <div className="mt-6">
                <DocumentVault employeeName={activeProfile.full_name} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboard New Employee Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[28px] border border-ink/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-ink/8 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b6b57]/10 text-[#0b6b57]">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Onboard New Employee</h3>
                  <p className="text-[11px] text-ink/50">Auto-provisions credentials, salary, and leave quota</p>
                </div>
              </div>
              <button onClick={() => setShowOnboardModal(false)} className="text-ink/40 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="mt-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-ink/60">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                    placeholder="e.g. David Kim"
                    className="mt-1 w-full rounded-xl border border-ink/15 p-2 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-ink/60">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={onboardEmail}
                    onChange={(e) => setOnboardEmail(e.target.value)}
                    placeholder="david@dayflow.com"
                    className="mt-1 w-full rounded-xl border border-ink/15 p-2 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-ink/60">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={onboardTitle}
                    onChange={(e) => setOnboardTitle(e.target.value)}
                    placeholder="e.g. DevOps Engineer"
                    className="mt-1 w-full rounded-xl border border-ink/15 p-2 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-ink/60">Phone Contact</label>
                  <input
                    type="text"
                    value={onboardPhone}
                    onChange={(e) => setOnboardPhone(e.target.value)}
                    placeholder="+1-555-0199"
                    className="mt-1 w-full rounded-xl border border-ink/15 p-2 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-ink/60">Base Monthly Salary ($)</label>
                <input
                  type="number"
                  required
                  value={onboardSalary}
                  onChange={(e) => setOnboardSalary(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 p-2 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="flex-1 rounded-full border border-ink/15 py-2.5 text-xs font-bold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboarding}
                  className="flex-1 rounded-full bg-[#0b6b57] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e] disabled:opacity-50"
                >
                  {onboarding ? "Provisioning..." : "Onboard Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
