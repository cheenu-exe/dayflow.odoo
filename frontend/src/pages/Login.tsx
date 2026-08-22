import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Building2, CheckCircle2, KeyRound, ShieldCheck, Sparkles, User, UserPlus } from "lucide-react";
import { DayflowMark } from "@/components/DayflowMark";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register, isLoading } = useAuth();
  
  const [tab, setTab] = useState<"signin" | "register">("signin");

  // Sign in form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register form state
  const [regOrgName, setRegOrgName] = useState("Acme Global HR");
  const [regFullName, setRegFullName] = useState("Jordan Lee");
  const [regEmail, setRegEmail] = useState("jordan@acme.com");
  const [regPassword, setRegPassword] = useState("Admin@1234");
  const [regTimezone, setRegTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");

  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === "HR_ADMIN" || user.role === "ADMIN") {
        setLocation("/admin");
      } else {
        setLocation("/");
      }
    } catch {
      // toast is handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await register({
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        organization_name: regOrgName,
        timezone: regTimezone,
      });
      setLocation("/admin");
    } catch {
      // toast is handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f7f5ef] dark:bg-[#121312] lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left Column: Brand & Architecture Story */}
      <section className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
        <div>
          <DayflowMark />
          <div className="my-auto max-w-lg pt-12 pb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-verdant/20 bg-verdant/8 px-3 py-1 text-[10px] font-extrabold tracking-[0.14em] uppercase text-verdant">
              <Sparkles className="h-3.5 w-3.5" />
              Dayflow HRMS Platform
            </div>

            <h1 className="mt-5 font-display text-4xl leading-[1.02] tracking-[-0.06em] text-ink dark:text-white sm:text-5xl lg:text-6xl">
              Every workday,<br />
              <span className="text-verdant">perfectly aligned.</span>
            </h1>

            <p className="mt-5 text-sm leading-relaxed text-ink/70 dark:text-white/70 sm:text-base">
              Autonomous workforce decision desk featuring real-time attendance logging, ML anomaly detection, concurrency-safe leave approvals, and deterministic payroll proration.
            </p>

            {/* Feature Highlights Pill Grid */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1c1d1a] p-4 shadow-xs">
                <p className="font-bold text-ink dark:text-white">Deterministic Proration</p>
                <p className="mt-1 text-[11px] text-ink/50 dark:text-white/50">Exact calendar-day salary proration for mid-month joiners.</p>
              </div>
              <div className="rounded-2xl border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1c1d1a] p-4 shadow-xs">
                <p className="font-bold text-ink dark:text-white">ML Staffing Coverage</p>
                <p className="mt-1 text-[11px] text-ink/50 dark:text-white/50">Real-time team conflict analysis and risk scoring.</p>
              </div>
              <div className="rounded-2xl border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1c1d1a] p-4 shadow-xs">
                <p className="font-bold text-ink dark:text-white">Anomaly Detection</p>
                <p className="mt-1 text-[11px] text-ink/50 dark:text-white/50">Scikit-learn IsolationForest autonomous alert feed.</p>
              </div>
              <div className="rounded-2xl border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1c1d1a] p-4 shadow-xs">
                <p className="font-bold text-ink dark:text-white">Concurrency-Safe Locking</p>
                <p className="mt-1 text-[11px] text-ink/50 dark:text-white/50">Zero race conditions on leave balance deductions.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 dark:border-white/10 pt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40 dark:text-white/40">
          <span>Dayflow · Modular HR Monolith</span>
          <span>FastAPI + PostgreSQL + React</span>
        </div>
      </section>

      {/* Right Column: Manual Sign-In Form Box */}
      <section className="relative flex items-center justify-center overflow-hidden bg-[#20211f] dark:bg-[#0d0e0d] p-7 text-white sm:p-10 lg:p-14">
        {/* Subtle geometric SVG backdrop */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pat" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="3 3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pat)" />
          </svg>
        </div>

        <div className="relative w-full max-w-md">
          {/* Tabs: Sign In / Create Org */}
          <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition ${
                tab === "signin" ? "bg-white text-ink shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition ${
                tab === "register" ? "bg-white text-ink shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              Create Organization
            </button>
          </div>

          {tab === "signin" ? (
            <form onSubmit={handleSignIn} className="rounded-[28px] border border-white/15 bg-white/[0.08] p-6 backdrop-blur-md sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b6b57] text-[#a8e6d5] shadow-inner">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-3xl tracking-[-0.04em]">Enter your desk</h2>
              <p className="mt-1.5 text-xs text-white/60">Enter your credentials to access your organization portal.</p>

              <div className="mt-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/70">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@dayflow.com or alice@dayflow.com"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-white/35 focus:border-[#a8e6d5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/70">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-white/35 focus:border-[#a8e6d5] focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#0b6b57] py-3 text-xs font-bold text-white shadow-lg transition hover:bg-[#084d3e] active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? (
                      "Authenticating..."
                    ) : (
                      <>
                        Sign In <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="rounded-[28px] border border-white/15 bg-white/[0.08] p-6 backdrop-blur-md sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b6b57] text-[#a8e6d5] shadow-inner">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-3xl tracking-[-0.04em]">Register Organization</h2>
              <p className="mt-1.5 text-xs text-white/60">Initialize tenant and provision the first HR Administrator.</p>

              <div className="mt-6 space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regOrgName}
                    onChange={(e) => setRegOrgName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 p-2.5 text-xs text-white focus:border-[#a8e6d5] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                      Admin Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 p-2.5 text-xs text-white focus:border-[#a8e6d5] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 p-2.5 text-xs text-white focus:border-[#a8e6d5] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 p-2.5 text-xs text-white focus:border-[#a8e6d5] focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#0b6b57] py-3 text-xs font-bold text-white shadow-lg transition hover:bg-[#084d3e] active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? (
                      "Initializing..."
                    ) : (
                      <>
                        Create Organization <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
