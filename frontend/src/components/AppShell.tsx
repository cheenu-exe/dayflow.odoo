import { Link, useLocation } from "wouter";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  User,
  UsersRound,
} from "lucide-react";
import { DayflowMark } from "./DayflowMark";
import { NotificationCenter } from "./NotificationCenter";
import { ChatbotWidget } from "./ChatbotWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const employeeItems = [
  { href: "/", label: "Today / Pulse", icon: LayoutDashboard },
  { href: "/employee/attendance", label: "My Attendance", icon: CalendarDays },
  { href: "/employee/leave", label: "Time Away (Leave)", icon: ClipboardCheck },
  { href: "/employee/payroll", label: "My Payslip", icon: CreditCard },
];

const adminItems = [
  { href: "/admin", label: "Health Monitor", icon: LayoutDashboard },
  { href: "/admin/leave", label: "Approval Desk", icon: ClipboardCheck },
  { href: "/admin/alerts", label: "Alert Inbox (ML)", icon: ShieldAlert },
  { href: "/admin/people", label: "People Directory", icon: UsersRound },
  { href: "/admin/payroll", label: "Payroll Desk", icon: CreditCard },
  { href: "/admin/analytics", label: "HR Analytics", icon: TrendingUp },
];

function getInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "DF";
}

export function AppShell({ role, children }: { role: "employee" | "admin"; children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, profile, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const items = role === "admin" ? adminItems : employeeItems;
  const displayName = profile?.full_name || (isAdmin ? "Sarah Jenkins (HR Director)" : user?.email || "Employee");
  const displayRole = profile?.job_title || (isAdmin ? "HR Director" : "Employee");
  const displayTeam = profile?.team?.name || (isAdmin ? "People Operations" : "General");

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] dark:bg-[#121312] text-[#20211f] dark:text-[#f4f4f0] lg:flex">
      {/* Sidebar Navigation */}
      <aside className="sticky top-0 z-30 hidden h-screen w-[260px] shrink-0 flex-col border-r border-ink/10 dark:border-white/10 bg-[#f7f5ef] dark:bg-[#121312] px-5 py-6 lg:flex">
        <DayflowMark />

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between px-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/40 dark:text-white/40">
              {role === "admin" ? "HR Control Room" : "Employee Desk"}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-verdant/10 px-2 py-0.5 text-[9px] font-bold text-verdant">
              <span className="h-1.5 w-1.5 rounded-full bg-verdant" />
              Live
            </span>
          </div>

          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-150 ${
                    active
                      ? "bg-[#0b6b57] text-white shadow-[0_4px_14px_rgba(11,107,87,0.2)]"
                      : "text-ink/65 dark:text-white/65 hover:bg-ink/[0.05] dark:hover:bg-white/5 hover:text-ink dark:hover:text-white"
                  }`}
                >
                  {active && <span className="absolute -left-5 h-7 w-[3.5px] rounded-r-full bg-[#c85a3a]" />}
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.4 : 1.9} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="mt-auto rounded-2xl border border-ink/10 dark:border-white/10 bg-white/80 dark:bg-[#1c1d1a] p-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b6b57]/10 font-display text-xs font-bold text-[#0b6b57] dark:bg-[#34d399]/20 dark:text-[#34d399]">
              {getInitials(displayName, user?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink dark:text-white">{displayName}</p>
              <p className="truncate text-[10px] text-ink/50 dark:text-white/50">{displayTeam} · {displayRole}</p>
            </div>
          </div>

          <div className="mt-3 border-t border-ink/8 dark:border-white/10 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-bold text-[#c85a3a] hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          {/* Top Header */}
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-ink/10 dark:border-white/10 bg-[#f7f5ef]/90 dark:bg-[#121312]/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
            <div className="lg:hidden">
              <DayflowMark label={false} />
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="font-extrabold uppercase tracking-[0.14em] text-ink/40 dark:text-white/40">Today</span>
              <span className="font-bold text-ink dark:text-white">{todayStr}</span>
            </div>

            {/* Notification Center, Dark Theme Toggle & Profile Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className="grid h-9 w-9 place-items-center rounded-full border border-ink/12 dark:border-white/15 bg-white dark:bg-[#1c1d1a] text-ink/70 dark:text-white/80 shadow-xs transition hover:border-verdant/40 hover:text-verdant"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
              </button>

              <NotificationCenter />

              {/* Only actual Administrators can toggle between Admin Control Room and Employee View */}
              {isAdmin && (
                <Link
                  href={role === "admin" ? "/" : "/admin"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-verdant/30 bg-verdant/8 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-verdant transition hover:bg-verdant hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Switch to {role === "admin" ? "Employee View" : "Admin View"}
                </Link>
              )}

              <button
                aria-label="Sign out"
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-ink/12 dark:border-white/15 bg-white dark:bg-[#1c1d1a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink/70 dark:text-white/70 transition hover:border-red-400 hover:text-red-600"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="px-5 py-7 sm:px-8 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>

        {/* Global Floating AI Chatbot Assistant */}
        <ChatbotWidget />
      </div>
    </div>
  );
}
