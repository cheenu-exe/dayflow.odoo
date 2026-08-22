import React, { createContext, useContext, useEffect, useState } from "react";
import { dayflowApi, setAccessToken, User, Profile } from "@/lib/api";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  role: "EMPLOYEE" | "HR_ADMIN" | "ADMIN" | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  quickLogin: (email: string, pass: string) => Promise<User>;
  register: (payload: { email: string; password: string; full_name: string; organization_name: string; timezone: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("access_token"));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function loadUserData() {
    try {
      const [meRes, profRes] = await Promise.all([
        dayflowApi.getMe(),
        dayflowApi.getMyProfile().catch(() => ({ data: null })),
      ]);
      setUser(meRes.data);
      if (profRes.data) {
        setProfile(profRes.data);
      }
    } catch {
      // Token expired or invalid
      setAccessToken(null);
      setTokenState(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      setAccessToken(token);
      loadUserData();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { data } = await dayflowApi.login(email, pass);
      setAccessToken(data.access_token);
      setTokenState(data.access_token);
      setUser(data.user);
      localStorage.setItem("user_role", data.user.role);

      try {
        const prof = await dayflowApi.getMyProfile();
        setProfile(prof.data);
      } catch {
        // Ignored
      }

      toast.success("Welcome back", { description: `Signed in as ${data.user.email}` });
      return data.user;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Invalid email or password.";
      toast.error("Sign in failed", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email: string, pass: string) => {
    return login(email, pass);
  };

  const register = async (payload: { email: string; password: string; full_name: string; organization_name: string; timezone: string }) => {
    setIsLoading(true);
    try {
      const { data } = await dayflowApi.register(payload);
      setAccessToken(data.access_token);
      setTokenState(data.access_token);
      setUser(data.user);
      localStorage.setItem("user_role", data.user.role);

      try {
        const prof = await dayflowApi.getMyProfile();
        setProfile(prof.data);
      } catch {
        // Ignored
      }

      toast.success("Organization created", { description: `Welcome to Dayflow, ${payload.full_name}!` });
      return data.user;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Registration failed.";
      toast.error("Sign up failed", { description: typeof msg === "string" ? msg : JSON.stringify(msg) });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setTokenState(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    toast.info("Signed out successfully");
  };

  const refreshUser = async () => {
    if (token) {
      await loadUserData();
    }
  };

  const role = user?.role ?? null;
  const isAdmin = role === "ADMIN" || role === "HR_ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        role,
        isAdmin,
        isLoading,
        login,
        quickLogin,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
