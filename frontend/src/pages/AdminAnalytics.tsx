import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { dayflowApi } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Award,
  Calendar,
  CreditCard,
  Download,
  Flame,
  PieChart as PieIcon,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const ATTENDANCE_TREND_DATA = [
  { day: "Mon 17", present: 23, halfday: 1, absent: 1, anomalies: 0 },
  { day: "Tue 18", present: 24, halfday: 0, absent: 1, anomalies: 1 },
  { day: "Wed 19", present: 22, halfday: 2, absent: 1, anomalies: 1 },
  { day: "Thu 20", present: 25, halfday: 0, absent: 0, anomalies: 0 },
  { day: "Fri 21", present: 21, halfday: 3, absent: 1, anomalies: 1 },
  { day: "Sat 22", present: 4, halfday: 0, absent: 0, anomalies: 1 },
  { day: "Sun 23", present: 1, halfday: 0, absent: 0, anomalies: 0 },
];

const LEAVE_UTILIZATION_DATA = [
  { name: "Paid Annual Leave", value: 45, color: "#0b6b57" },
  { name: "Sick Leave", value: 18, color: "#d79a2b" },
  { name: "Unpaid Leave", value: 6, color: "#c85a3a" },
  { name: "Remaining Entitlement", value: 180, color: "#e5e7eb" },
];

const DEPARTMENT_PAYROLL_DATA = [
  { department: "Engineering (10)", monthly: 540000, color: "#0b6b57" },
  { department: "Sales (8)", monthly: 380000, color: "#2563eb" },
  { department: "HR & People (5)", monthly: 245000, color: "#d79a2b" },
  { department: "Operations (2)", monthly: 95000, color: "#9333ea" },
];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(false);

  function handleExportReport() {
    toast.success("Executive HR report generated!", {
      description: "Compiling attendance, leave burn-down, and payroll charts.",
    });
    window.print();
  }

  return (
    <AppShell role="admin">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Workforce Intelligence
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Executive HR Analytics</h1>
          <p className="text-xs text-ink/60">
            Attendance velocity, leave consumption burn-down, and department budget allocations.
          </p>
        </div>

        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0b6b57] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e]"
        >
          <Download className="h-3.5 w-3.5" /> Export Analytics Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="mt-7 grid gap-4 sm:grid-cols-4">
        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Punctuality Rate</span>
          <p className="mt-2 font-display text-3xl font-bold text-[#0b6b57]">96.4%</p>
          <p className="mt-1 text-[11px] text-ink/50">Checked in 08:30 - 10:00</p>
        </div>

        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Leave Utilization</span>
          <p className="mt-2 font-display text-3xl font-bold text-[#d79a2b]">28.6%</p>
          <p className="mt-1 text-[11px] text-ink/50">Annual quota consumed</p>
        </div>

        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Total Monthly Spend</span>
          <p className="mt-2 font-display text-3xl font-bold text-ink">$1,260,000</p>
          <p className="mt-1 text-[11px] text-ink/50">Gross compensation budget</p>
        </div>

        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Anomaly Index</span>
          <p className="mt-2 font-display text-3xl font-bold text-[#c85a3a]">3.1%</p>
          <p className="mt-1 text-[11px] text-ink/50">Flagged by Isolation Forest</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {/* Chart 1: Attendance Velocity */}
        <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-ink/8 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Attendance Velocity</h3>
              <p className="text-[11px] text-ink/50">Daily shifts by Present, Half-day, and Absent</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
              Live Feed
            </span>
          </div>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ATTENDANCE_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,33,31,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="present" fill="#0b6b57" name="Present (>8h)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="halfday" fill="#d79a2b" name="Half-day (<4h)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#c85a3a" name="Absent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Department Payroll Breakdown */}
        <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-ink/8 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Department Payroll Allocation</h3>
              <p className="text-[11px] text-ink/50">Monthly gross allocation by functional team</p>
            </div>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
              Prorated
            </span>
          </div>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPARTMENT_PAYROLL_DATA} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,33,31,0.06)" />
                <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 10 }} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                <Bar dataKey="monthly" fill="#0b6b57" name="Monthly Total ($)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Leave Utilization Burndown */}
        <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-xs xl:col-span-2">
          <div className="flex items-center justify-between border-b border-ink/8 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Leave Burn-Down by Type</h3>
              <p className="text-[11px] text-ink/50">Paid annual leave, sick leave, and remaining organization quota</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-6">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={LEAVE_UTILIZATION_DATA}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {LEAVE_UTILIZATION_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {LEAVE_UTILIZATION_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl bg-[#f7f5ef] p-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-ink">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-ink">{item.value} days</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
