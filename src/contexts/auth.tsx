// src/contexts/auth.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  refreshTokenApi as apiRefreshToken,
  setAuthHelpers,
  me as apiMe,
  logout as apiLogout,
} from "@/lib/api";

type AuthContextType = {
  ready: boolean;
  access: string | null;
  refresh: string | null;
  user: any | null;
  isAdmin: boolean;
  login: (id: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, birthday?: string | null) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    setAccess(localStorage.getItem("access"));
    setRefresh(localStorage.getItem("refresh"));
    setReady(true);
  }, []);

  useEffect(() => {
    access ? localStorage.setItem("access", access) : localStorage.removeItem("access");
  }, [access]);
  useEffect(() => {
    refresh ? localStorage.setItem("refresh", refresh) : localStorage.removeItem("refresh");
  }, [refresh]);

  useEffect(() => {
    setAuthHelpers(
      () => access,
      async () => {
        if (!refresh) return false;
        try {
          const res = await apiRefreshToken(refresh);
          if (!res?.access) return false;
          setAccess(res.access);
          return true;
        } catch {
          setAccess(null);
          setRefresh(null);
          return false;
        }
      }
    );
  }, [access, refresh]);

  // Load /me whenever access changes (login, restore from storage, logout)
  useEffect(() => {
    if (!access) {
      setUser(null);
      return;
    }
    let cancelled = false;
    apiMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [access]);

  const value = useMemo<AuthContextType>(() => ({
    ready,
    access,
    refresh,
    user,
    isAdmin: Boolean(user?.is_staff),
    async login(id: string, password: string) {
      setUser(null);
      const tokens = await apiLogin(id.trim(), password);
      setAccess(tokens.access);
      if ((tokens as any).refresh) setRefresh((tokens as any).refresh);
      setAuthHelpers(
        () => tokens.access,
        async () => {
          const r = (tokens as any).refresh || localStorage.getItem("refresh");
          if (!r) return false;
          try {
            const res = await apiRefreshToken(r);
            if (!res?.access) return false;
            setAccess(res.access);
            setAuthHelpers(() => res.access, () => Promise.resolve(true));
            return true;
          } catch {
            setAccess(null); setRefresh(null);
            return false;
          }
        }
      );
    },
    async register(username, email, password, birthday) {
      const out = await apiRegister(username.trim(), email.trim(), password, birthday);
      setAccess(out.access);
      setRefresh(out.refresh);
      setAuthHelpers(() => out.access, () => Promise.resolve(true));
    },
    async refreshUser() {
      if (!access) return;
      try {
        const u = await apiMe();
        setUser(u);
      } catch {
        setUser(null);
      }
    },
    logout() {
      try {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
      } catch {
        /* ignore */
      }
      setAccess(null);
      setRefresh(null);
      setUser(null);
      setAuthHelpers(
        () => null,
        async () => false,
      );
      void apiLogout().catch(() => {});
    },
  }), [ready, access, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
