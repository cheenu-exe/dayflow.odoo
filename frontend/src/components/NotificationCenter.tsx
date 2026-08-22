import { useState } from "react";
import { Bell, Check, CheckCircle2, Clock, Flame, ShieldAlert, Sparkles, X } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "leave" | "payroll" | "anomaly" | "system";
  read: boolean;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Annual Leave Approved",
    message: "Your leave request for next week was approved by HR Admin (Sarah Jenkins). Balance updated.",
    time: "10m ago",
    type: "leave",
    read: false,
  },
  {
    id: "2",
    title: "August Payslip Generated",
    message: "Your deterministic calendar-day prorated payslip for August 2026 is now available for review.",
    time: "2h ago",
    type: "payroll",
    read: false,
  },
  {
    id: "3",
    title: "ML Anomaly Feed Active",
    message: "IsolationForest algorithm initialized and monitoring daily shift arrival vectors.",
    time: "1d ago",
    type: "anomaly",
    read: true,
  },
];

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markSingleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-ink/12 bg-white text-ink/70 transition hover:border-verdant/40 hover:text-verdant"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#c85a3a] text-[9px] font-extrabold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-ink/15 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-ink/8 pb-3">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-sm font-bold text-ink">Notifications</h4>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#c85a3a]/10 px-2 py-0.2 text-[9.5px] font-bold text-[#c85a3a]">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-[#0b6b57] hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 divide-y divide-ink/6 max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markSingleRead(n.id)}
                className={`flex items-start gap-3 py-3 px-1 cursor-pointer rounded-xl transition hover:bg-[#f7f5ef] ${
                  !n.read ? "bg-[#0b6b57]/4" : ""
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                    n.type === "leave"
                      ? "bg-emerald-100 text-emerald-800"
                      : n.type === "payroll"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {n.type === "leave" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : n.type === "payroll" ? (
                    <Sparkles className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${!n.read ? "font-bold text-ink" : "font-medium text-ink/80"}`}>
                      {n.title}
                    </p>
                    <span className="text-[9px] text-ink/40">{n.time}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink/60 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
