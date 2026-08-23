import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setToken, getToken } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "student";
  status: string;
  avatarFileId: string | null;
  phone?: string;
  studentCode?: string;
  className?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  batch?: string | null;
  guardianName?: string | null;
  enrollmentDate?: string | null;
  designation?: string;
  bio?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (role: "admin" | "student", creds: { identifier?: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSession: (user: AuthUser, token: string) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.get<{ user: AuthUser }>("/auth/me");
        setUser(me.user);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(role: "admin" | "student", creds: { identifier?: string; email?: string; password: string }) {
    const path = role === "admin" ? "/auth/admin/login" : "/auth/student/login";
    const res = await api.post<{ accessToken: string; user: AuthUser }>(path, creds);
    setToken(res.accessToken);
    setUser(res.user);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* noop */
    }
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const me = await api.get<{ user: AuthUser }>("/auth/me");
    setUser(me.user);
  }

  function setSession(user: AuthUser, token: string) {
    setToken(token);
    setUser(user);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refreshUser, setSession }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
