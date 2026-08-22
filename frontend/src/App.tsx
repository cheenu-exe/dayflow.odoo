/** STYLE: Signal Ledger — editorial workforce decision desk; dynamic routing and full feature set. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Employee Pages
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeAttendance from "./pages/EmployeeAttendance";
import EmployeeLeave from "./pages/EmployeeLeave";
import EmployeePayslip from "./pages/EmployeePayslip";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminLeaveApproval from "./pages/AdminLeaveApproval";
import AdminAlertInbox from "./pages/AdminAlertInbox";
import AdminPeopleDirectory from "./pages/AdminPeopleDirectory";
import AdminPayroll from "./pages/AdminPayroll";
import AdminAnalytics from "./pages/AdminAnalytics";

// Auth
import Login from "./pages/Login";

function ProtectedRouter() {
  const { user, isLoading, isAdmin } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] text-xs font-bold text-ink/50">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#0b6b57]" />
          Connecting to Dayflow Workspace...
        </div>
      </div>
    );
  }

  // If unauthenticated and not on /login, redirect to /login
  if (!user && location !== "/login") {
    return <Redirect to="/login" />;
  }

  // If on /login and already authenticated, redirect to appropriate home
  if (user && location === "/login") {
    return <Redirect to={isAdmin ? "/admin" : "/"} />;
  }

  return (
    <Switch>
      {/* Auth */}
      <Route path="/login" component={Login} />

      {/* Employee Module */}
      <Route path="/" component={EmployeeDashboard} />
      <Route path="/employee" component={EmployeeDashboard} />
      <Route path="/employee/attendance" component={EmployeeAttendance} />
      <Route path="/employee/leave" component={EmployeeLeave} />
      <Route path="/employee/payroll" component={EmployeePayslip} />

      {/* Admin Module */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/leave" component={AdminLeaveApproval} />
      <Route path="/admin/alerts" component={AdminAlertInbox} />
      <Route path="/admin/people" component={AdminPeopleDirectory} />
      <Route path="/admin/payroll" component={AdminPayroll} />
      <Route path="/admin/analytics" component={AdminAnalytics} />


      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <ProtectedRouter />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
