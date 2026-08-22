import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusTag } from "@/components/StatusTag";
import { dayflowApi, AttendanceRecord } from "@/lib/api";
import { Calendar, CheckCircle2, Clock, Filter, Fingerprint, Globe, MapPin, Search, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

function getStatusDetails(rec?: AttendanceRecord) {
  if (!rec) return { label: "Absent", tone: "red" as const, desc: "No check-in" };
  const hrs = rec.worked_hours ? Number(rec.worked_hours) : 0;
  if (!rec.check_out_utc) return { label: "In Progress", tone: "amber" as const, desc: "Active shift" };
  if (hrs >= 7.5) return { label: "Present", tone: "green" as const, desc: "Full shift (>8h)" };
  if (hrs > 0) return { label: "Half-day", tone: "amber" as const, desc: "Partial shift (<4h)" };
  return { label: "Present", tone: "green" as const, desc: "Logged" };
}

export default function EmployeeAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"weekly" | "ledger">("weekly");

  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function loadAttendance() {
    try {
      setLoading(true);
      const res = await dayflowApi.myAttendance();
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  const filtered = records.filter(
    (r) =>
      r.local_date.includes(searchTerm) ||
      (r.timezone && r.timezone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalShifts = records.length;
  const totalHours = records.reduce((acc, r) => acc + (r.worked_hours ? Number(r.worked_hours) : 0), 0);
  const avgHours = totalShifts > 0 ? (totalHours / totalShifts).toFixed(1) : "0.0";

  // Build current week dates (Mon - Sun)
  const currentWeekDays = (() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const match = records.find((r) => r.local_date === dateStr);
      days.push({
        date: dateStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: dateStr === now.toISOString().split("T")[0],
        record: match,
      });
    }
    return days;
  })();

  const weekHours = currentWeekDays.reduce(
    (acc, d) => acc + (d.record?.worked_hours ? Number(d.record.worked_hours) : 0),
    0
  );

  return (
    <AppShell role="employee">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#0b6b57]" />
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink/40">
              Personal Attendance & Timesheets
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em]">Attendance Management</h1>
          <p className="text-xs text-ink/60">
            Daily and weekly timesheet classifications: Present, Half-day, Absent, and On Leave.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white p-1 shadow-xs">
          <button
            onClick={() => setViewMode("weekly")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              viewMode === "weekly" ? "bg-[#20211f] text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            Weekly Timesheet View
          </button>
          <button
            onClick={() => setViewMode("ledger")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              viewMode === "ledger" ? "bg-[#20211f] text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            Complete Ledger ({records.length})
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">This Week's Logged</span>
            <Clock className="h-4 w-4 text-[#0b6b57]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink">{weekHours.toFixed(1)} / 40 hrs</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-ink/5 overflow-hidden">
            <div
              className="h-full bg-[#0b6b57] transition-all"
              style={{ width: `${Math.min(100, (weekHours / 40) * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Total Career Shifts</span>
            <CheckCircle2 className="h-4 w-4 text-[#d79a2b]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink">{totalShifts} shifts</p>
          <p className="mt-1 text-[11px] text-ink/50">{totalHours.toFixed(1)} cumulative hours</p>
        </div>

        <div className="rounded-[22px] border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-ink/40">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Avg Shift Duration</span>
            <Globe className="h-4 w-4 text-[#c85a3a]" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink">{avgHours} hrs/shift</p>
          <p className="mt-1 text-[11px] text-ink/50">Target standard: 8.0 - 9.0 hrs</p>
        </div>
      </div>

      {/* View 1: Weekly Timesheet Grid */}
      {viewMode === "weekly" && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-1 rounded-full bg-[#0b6b57]" />
              <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink/70">
                Weekly Timesheet (Monday – Sunday)
              </h2>
            </div>
            <span className="text-xs text-ink/40 font-bold">Standard 40.0h Goal</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {currentWeekDays.map((day) => {
              const status = getStatusDetails(day.record);
              const isWeekend = day.dayName === "Sat" || day.dayName === "Sun";
              return (
                <div
                  key={day.date}
                  className={`flex flex-col justify-between rounded-[22px] border p-4 shadow-xs transition ${
                    day.isToday
                      ? "border-[#0b6b57] bg-white ring-2 ring-[#0b6b57]/20"
                      : isWeekend
                      ? "border-ink/8 bg-[#f7f5ef]/50"
                      : "border-ink/10 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink/50">{day.dayName}</span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          day.isToday ? "bg-[#0b6b57] text-white" : "text-ink"
                        }`}
                      >
                        {day.dayNum}
                      </span>
                    </div>

                    <div className="mt-3">
                      <StatusTag label={status.label} tone={status.tone} />
                    </div>
                  </div>

                  <div className="mt-6 border-t border-ink/8 pt-2.5 text-xs">
                    {day.record ? (
                      <>
                        <p className="font-bold text-ink">{day.record.worked_hours ?? "—"} hrs</p>
                        <p className="text-[10px] text-ink/45">
                          {new Date(day.record.check_in_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {day.record.check_out_utc &&
                            ` → ${new Date(day.record.check_out_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-ink/35">{isWeekend ? "Off-day" : "No shift logged"}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Complete Ledger */}
      {viewMode === "ledger" && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by date (YYYY-MM-DD) or zone..."
                className="w-full rounded-full border border-ink/15 bg-white py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink/35 focus:border-[#0b6b57] focus:outline-none"
              />
            </div>
            <span className="text-xs font-bold text-ink/50">Showing {filtered.length} records</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[26px] border border-ink/10 bg-white shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs font-bold text-ink/40 animate-pulse">
                Loading attendance records...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink/50">
                No matching attendance records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ink/8 bg-[#f7f5ef] text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/50">
                    <tr>
                      <th className="py-3.5 px-6">Work Date</th>
                      <th className="py-3.5 px-4">Check-In</th>
                      <th className="py-3.5 px-4">Check-Out</th>
                      <th className="py-3.5 px-4">Worked Hours</th>
                      <th className="py-3.5 px-4">Timezone Snapshot</th>
                      <th className="py-3.5 px-4">Source</th>
                      <th className="py-3.5 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/8 font-medium text-ink/80">
                    {filtered.map((rec) => {
                      const inTime = new Date(rec.check_in_utc);
                      const outTime = rec.check_out_utc ? new Date(rec.check_out_utc) : null;
                      const status = getStatusDetails(rec);
                      return (
                        <tr key={rec.id} className="transition hover:bg-[#f7f5ef]/40">
                          <td className="py-4 px-6 font-bold text-ink">{rec.local_date}</td>
                          <td className="py-4 px-4 font-mono text-xs">
                            {inTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs">
                            {outTime ? outTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="py-4 px-4 font-bold text-ink">
                            {rec.worked_hours ? `${rec.worked_hours} hrs` : "In Progress"}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] text-ink/60">
                              <MapPin className="h-3 w-3 text-persimmon" /> {rec.timezone}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="rounded-md bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase text-ink/60">
                              {rec.source}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <StatusTag label={status.label} tone={status.tone} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
