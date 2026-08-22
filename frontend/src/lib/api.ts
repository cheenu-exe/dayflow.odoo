/** STYLE: Signal Ledger — a precise, warm operations interface with explicit data contracts. */
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor to auto attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem("access_token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("access_token");
    delete api.defaults.headers.common.Authorization;
  }
}

export type User = {
  id: string;
  email: string;
  role: "EMPLOYEE" | "HR_ADMIN" | "ADMIN";
  organization_id: string;
  is_active: boolean;
};

export type CoverageRisk = {
  level: "GREEN" | "AMBER" | "RED";
  staffing_ratio: number;
  team_size: number;
  affected_dates: string[];
  message: string;
};

export type AttendanceRecord = {
  id: string;
  user_id: string;
  local_date: string;
  timezone: string;
  check_in_utc: string;
  check_out_utc?: string | null;
  worked_hours?: number | null;
  source: "WEB" | "PASSKEY";
  user?: {
    email: string;
    profile?: {
      full_name: string;
      job_title: string;
      team?: { name: string };
    };
  };
};

export type LeaveType = {
  id: string;
  organization_id: string;
  name: string;
  annual_days: number;
};

export type LeaveBalance = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled: number;
  used: number;
  remaining: number;
  leave_type?: LeaveType;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  coverage_risk?: CoverageRisk | null;
  employee?: Profile;
  leave_type?: LeaveType;
  created_at?: string;
};

export type AnomalyAlert = {
  id: string;
  attendance_id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  score?: number | null;
  status: "OPEN" | "RESOLVED";
  created_at: string;
  attendance?: AttendanceRecord | null;
};

export type SalaryStructure = {
  id: string;
  employee_id: string;
  effective_from: string;
  basic_monthly: number;
  housing_monthly: number;
  transport_monthly: number;
};

export type Payslip = {
  month: string;
  employee_name: string;
  job_title: string;
  team_name?: string;
  days_in_month: number;
  eligible_days: number;
  proration_factor: number | string;
  basic_salary: number | string;
  housing_allowance: number | string;
  transport_allowance: number | string;
  basic_prorated: number | string;
  housing_prorated: number | string;
  transport_prorated: number | string;
  gross_prorated: number | string;
};

export type Profile = {
  id: string;
  user_id: string;
  team_id: string;
  full_name: string;
  job_title: string;
  join_date: string;
  timezone: string;
  phone?: string | null;
  user?: User;
  team?: { id: string; name: string } | null;
  salary_structures?: SalaryStructure[];
  leave_balances?: LeaveBalance[];
};

export type DashboardMeResponse = {
  today_attendance?: AttendanceRecord | null;
  upcoming_leave?: LeaveRequest[];
  open_anomalies: number;
  insight: string;
};

export type DashboardAdminResponse = {
  pending_leave_count: number;
  open_alerts_count: number;
  todays_team_checkins: number;
  total_employees: number;
  leave_queue: LeaveRequest[];
  recent_alerts: AnomalyAlert[];
};

export const dayflowApi = {
  // Auth
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string; user: User }>("/auth/login", { email, password }),
  register: (payload: { email: string; password: string; full_name: string; organization_name: string; timezone: string }) =>
    api.post<{ access_token: string; user: User }>("/auth/register", payload),
  getMe: () => api.get<User>("/auth/me"),

  // Dashboards
  dashboard: () => api.get<DashboardMeResponse>("/dashboard/me"),
  adminDashboard: () => api.get<DashboardAdminResponse>("/dashboard/admin"),

  // Profiles
  getMyProfile: () => api.get<Profile>("/profiles/me"),
  updateMyProfile: (payload: { phone?: string; timezone?: string }) =>
    api.patch<Profile>("/profiles/me", payload),
  listProfiles: (search?: string, teamId?: string) =>
    api.get<Profile[]>("/profiles", { params: { search, team_id: teamId } }),
  updateProfile: (userId: string, payload: { full_name?: string; job_title?: string; team_id?: string; timezone?: string; phone?: string }) =>
    api.patch<Profile>(`/profiles/${userId}`, payload),

  // Attendance
  myAttendance: () => api.get<AttendanceRecord[]>("/attendance/me"),
  teamAttendance: (startDate?: string, endDate?: string) =>
    api.get<AttendanceRecord[]>("/attendance/team", { params: { start_date: startDate, end_date: endDate } }),
  checkIn: (payload: { local_date: string; timezone: string; check_in_local: string; source?: "WEB" | "PASSKEY" }) =>
    api.post<AttendanceRecord>("/attendance/check-in", payload),
  checkOut: (attendanceId: string, check_out_local: string) =>
    api.post<AttendanceRecord>(`/attendance/${attendanceId}/check-out`, { check_out_local }),
  anomalyAlerts: (statusFilter: string = "OPEN") =>
    api.get<AnomalyAlert[]>("/attendance/alerts", { params: { status_filter: statusFilter } }),
  resolveAlert: (alertId: string) =>
    api.patch<AnomalyAlert>(`/attendance/alerts/${alertId}/resolve`),

  // Employee Management
  onboardEmployee: (payload: {
    email: string;
    password?: string;
    full_name: string;
    job_title: string;
    team_id?: string;
    timezone?: string;
    phone?: string;
    basic_monthly?: number;
    housing_monthly?: number;
    transport_monthly?: number;
  }) => api.post<Profile>("/profiles/onboard", payload),
  deleteEmployee: (userId: string) => api.delete(`/profiles/${userId}`),

  // Leave
  listLeaveTypes: () => api.get<LeaveType[]>("/leave/types"),
  createLeaveType: (payload: { name: string; annual_days: number }) =>
    api.post<LeaveType>("/leave/types", payload),
  deleteLeaveType: (typeId: string) => api.delete(`/leave/types/${typeId}`),
  myBalances: () => api.get<LeaveBalance[]>("/leave/balances/me"),
  createBalance: (payload: { employee_id: string; leave_type_id: string; year: number; entitled: number }) =>
    api.post<LeaveBalance>("/leave/balances", payload),
  myLeave: () => api.get<LeaveRequest[]>("/leave/requests/me"),
  submitLeave: (payload: { leave_type_id: string; start_date: string; end_date: string; reason?: string }) =>
    api.post<LeaveRequest>("/leave/requests", payload),
  approvalQueue: () => api.get<LeaveRequest[]>("/leave/requests"),
  approveLeave: (id: string, note?: string) =>
    api.post<LeaveRequest>(`/leave/requests/${id}/approve`, { note }),
  rejectLeave: (id: string, note?: string) =>
    api.post<LeaveRequest>(`/leave/requests/${id}/reject`, { note }),

  // Payroll
  myStructures: () => api.get<SalaryStructure[]>("/payroll/me/structures"),
  myPayslip: (month: string) => api.get<Payslip>("/payroll/me/payslip", { params: { month } }),
  employeePayslip: (userId: string, month: string) =>
    api.get<Payslip>(`/payroll/employees/${userId}/payslip`, { params: { month } }),
  createStructure: (userId: string, payload: { effective_from: string; basic_monthly: number; housing_monthly?: number; transport_monthly?: number }) =>
    api.post<SalaryStructure>(`/payroll/employees/${userId}/structures`, payload),

  // AI Chatbot
  chat: (messages: { role: string; content: string }[], groq_api_key?: string, model?: string) =>
    api.post<{ reply: string; source: string }>("/chat", { messages, groq_api_key, model }),
};

