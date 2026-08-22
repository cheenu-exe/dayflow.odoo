import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { dayflowApi, Profile, Payslip } from "@/lib/api";
import { Calculator, Calendar, CreditCard, DollarSign, Download, FileText, Search, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

export default function AdminPayroll() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [payslips, setPayslips] = useState<{ profile: Profile; payslip: Payslip | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [search, setSearch] = useState("");

  async function loadPayrollData() {
    try {
      setLoading(true);
      const res = await dayflowApi.listProfiles();
      const profs = res.data || [];
      setProfiles(profs);

      // Fetch payslips for all employees for the selected month in parallel
      const slipPromises = profs.map(async (p) => {
        try {
          const sRes = await dayflowApi.employeePayslip(p.user_id, selectedMonth);
          return { profile: p, payslip: sRes.data };
        } catch {
          return { profile: p, payslip: null };
        }
      });

      const results = await Promise.all(slipPromises);
      setPayslips(results);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayrollData();
  }, [selectedMonth]);

  const filtered = payslips.filter((item) =>
    item.profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
    item.profile.job_title.toLowerCase().includes(search.toLowerCase()) ||
    (item.profile.team?.name && item.profile.team.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalGross = filtered.reduce(
    (acc, item) => acc + (item.payslip ? Number(item.payslip.gross_prorated) : 0),
    0
  );

  const proratedCount = filtered.filter(
    (item) => item.payslip && Number(item.payslip.proration_factor) < 1
  ).length;

  return (
    <AppShell role="admin">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Compensation Governance
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Payroll Desk & Proration</h1>
          <p className="text-xs text-ink/60">
            Organization-wide salary computation, mid-month proration audits, and compensation statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1.5 shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-ink/40" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-ink focus:outline-none"
            >
              <option value="2026-08-01">August 2026</option>
              <option value="2026-07-01">July 2026</option>
              <option value="2026-06-01">June 2026</option>
              <option value="2026-05-01">May 2026</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-xs hover:border-verdant hover:text-verdant"
          >
            <Download className="h-3.5 w-3.5" /> Export Payroll Sheet
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Total Monthly Payroll</span>
            <DollarSign className="h-4 w-4 text-[#0b6b57]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-[#0b6b57]">
            ${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-ink/50">For period {selectedMonth}</p>
        </div>

        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Eligible Headcount</span>
            <Users className="h-4 w-4 text-[#d79a2b]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink">{filtered.length} employees</p>
          <p className="mt-1 text-[11px] text-ink/50">With active structures</p>
        </div>

        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Mid-Month Prorations</span>
            <Calculator className="h-4 w-4 text-[#c85a3a]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-[#c85a3a]">{proratedCount}</p>
          <p className="mt-1 text-[11px] text-ink/50">E.g. join date after the 1st</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="mt-8 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by employee name, role or team..."
            className="w-full rounded-full border border-ink/15 bg-white py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink/35 focus:border-[#0b6b57] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
            Calculating proration statements across all employee records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink/50">
            No employees found for this search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink/8 bg-[#f7f5ef] text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/50">
                <tr>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-4">Eligible / Total Days</th>
                  <th className="py-3.5 px-4">Proration Factor</th>
                  <th className="py-3.5 px-4">Basic Prorated</th>
                  <th className="py-3.5 px-4">Housing</th>
                  <th className="py-3.5 px-4">Transport</th>
                  <th className="py-3.5 px-6 text-right">Gross Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8 font-medium text-ink/80">
                {filtered.map(({ profile, payslip }) => (
                  <tr key={profile.id} className="transition hover:bg-[#f7f5ef]/40">
                    <td className="py-4 px-6">
                      <p className="font-bold text-ink">{profile.full_name}</p>
                      <p className="text-[10.5px] text-ink/50">{profile.job_title}</p>
                    </td>
                    <td className="py-4 px-4">{profile.team?.name || "General"}</td>
                    <td className="py-4 px-4 font-mono">
                      {payslip ? (
                        <span className={Number(payslip.proration_factor) < 1 ? "font-bold text-[#c85a3a]" : ""}>
                          {payslip.eligible_days} / {payslip.days_in_month} d
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold">
                      {payslip ? (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] ${
                            Number(payslip.proration_factor) < 1
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {payslip.proration_factor}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono">
                      {payslip ? `$${Number(payslip.basic_prorated).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-4 px-4 font-mono">
                      {payslip ? `$${Number(payslip.housing_prorated).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-4 px-4 font-mono">
                      {payslip ? `$${Number(payslip.transport_prorated).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-[#0b6b57]">
                      {payslip ? `$${Number(payslip.gross_prorated).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "Unset"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
