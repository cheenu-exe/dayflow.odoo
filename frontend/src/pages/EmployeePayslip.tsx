import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { dayflowApi, Payslip } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Calculator, Calendar, CheckCircle2, CreditCard, Download, FileText, Printer, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function EmployeePayslip() {
  const { profile, user } = useAuth();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPayslip(month: string) {
    try {
      setLoading(true);
      const res = await dayflowApi.myPayslip(month);
      setPayslip(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load payslip", {
        description: err?.response?.data?.detail || "No active salary structure found for this period.",
      });
      setPayslip(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayslip(selectedMonth);
  }, [selectedMonth]);

  function handlePrint() {
    window.print();
  }

  const factorPercent = payslip
    ? (Number(payslip.proration_factor) * 100).toFixed(1)
    : "100.0";

  return (
    <AppShell role="employee">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Compensation & Payroll
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Deterministic Payslip</h1>
          <p className="text-xs text-ink/60">
            Automated calendar-day inclusive proration for joiners and monthly payroll.
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
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-bold text-ink shadow-xs hover:border-verdant hover:text-verdant"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 rounded-[28px] border border-ink/10 bg-white p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
          Calculating deterministic payslip for {selectedMonth}...
        </div>
      ) : !payslip ? (
        <div className="mt-10 rounded-[28px] border border-dashed border-ink/20 bg-white p-12 text-center text-sm text-ink/50">
          No salary structure registered for this month.
        </div>
      ) : (
        <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(350px,0.8fr)]">
          {/* Main Statement Receipt */}
          <div className="rounded-[30px] border border-ink/12 bg-white p-7 shadow-md sm:p-9">
            {/* Payslip Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 pb-6">
              <div>
                <div className="font-display text-2xl font-bold tracking-tight text-ink">
                  Dayflow Technologies Inc.
                </div>
                <p className="text-[11px] text-ink/50">Official Monthly Earnings Statement</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-verdant/10 px-3 py-1 text-[10px] font-extrabold uppercase text-verdant">
                  Finalized
                </span>
                <p className="mt-1 font-mono text-xs font-bold text-ink">Period: {payslip.month}</p>
              </div>
            </div>

            {/* Employee Metadata Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-[#f7f5ef] p-4 text-xs sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-ink/40">Employee</p>
                <p className="mt-1 font-bold text-ink">{payslip.employee_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-ink/40">Job Title</p>
                <p className="mt-1 font-semibold text-ink">{payslip.job_title}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-ink/40">Eligible Days</p>
                <p className="mt-1 font-bold text-verdant">
                  {payslip.eligible_days} / {payslip.days_in_month} days
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-ink/40">Proration Factor</p>
                <p className="mt-1 font-mono font-bold text-ink">
                  {payslip.proration_factor} ({factorPercent}%)
                </p>
              </div>
            </div>

            {/* Compensation Table */}
            <div className="mt-8">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-ink/10 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink/45">
                  <tr>
                    <th className="pb-3">Salary Component</th>
                    <th className="pb-3 text-right">Base Monthly Rate</th>
                    <th className="pb-3 text-right">Prorated Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8 text-ink/80">
                  <tr>
                    <td className="py-3.5 font-bold text-ink">Basic Salary</td>
                    <td className="py-3.5 text-right font-mono">${Number(payslip.basic_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 text-right font-mono font-bold text-ink">${Number(payslip.basic_prorated).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-bold text-ink">Housing Allowance</td>
                    <td className="py-3.5 text-right font-mono">${Number(payslip.housing_allowance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 text-right font-mono font-bold text-ink">${Number(payslip.housing_prorated).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-bold text-ink">Transport Allowance</td>
                    <td className="py-3.5 text-right font-mono">${Number(payslip.transport_allowance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 text-right font-mono font-bold text-ink">${Number(payslip.transport_prorated).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-ink/15">
                  <tr className="text-sm font-bold text-ink">
                    <td className="pt-4 font-display text-base">Gross Prorated Earnings</td>
                    <td className="pt-4 text-right text-xs text-ink/40">Total Payable</td>
                    <td className="pt-4 text-right font-mono text-lg font-bold text-[#0b6b57]">
                      ${Number(payslip.gross_prorated).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-8 border-t border-ink/8 pt-4 text-[10px] text-ink/40 text-center">
              Generated securely by Dayflow Modular HR Monolith · Conforms to strict ISO payroll standards.
            </div>
          </div>

          {/* Right Insights Card: Proration Logic Explanation */}
          <div className="space-y-6">
            <div className="rounded-[30px] border border-ink/10 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#0b6b57]" />
                <h3 className="font-display text-lg font-bold">Proration Formula</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink/65">
                Under the inclusive calendar-day convention, earnings are computed strictly by:
              </p>

              <div className="mt-4 rounded-xl bg-[#20211f] p-4 font-mono text-xs text-[#a8e6d5]">
                Proration = Eligible Days / Days in Month<br />
                = {payslip.eligible_days} / {payslip.days_in_month}<br />
                = {payslip.proration_factor}
              </div>

              {Number(payslip.proration_factor) < 1 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                  <p className="font-bold">Mid-Month Adjustment Detected</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    This account was active for {payslip.eligible_days} days out of {payslip.days_in_month} in this period (e.g. joined on the 15th). All monetary components have been prorated accurately to cents.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[30px] border border-ink/10 bg-[#f7f5ef] p-6 shadow-xs">
              <div className="flex items-center gap-2 text-[#0b6b57]">
                <Sparkles className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-[0.1em]">Direct Deposit</h4>
              </div>
              <p className="mt-2 text-xs text-ink/70">
                Prorated earnings will be disbursed automatically on the last banking day of {payslip.month}.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
