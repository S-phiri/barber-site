// src/contexts/auth.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  refreshToken as apiRefreshToken,
  setAuthHelpers,
} from "@/lib/api"; // ← change path if your api file is somewhere else

type AuthContextType = {
  ready: boolean;
  access: string | null;
  refresh: string | null;
  login: (id: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<string | null>(null);

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

  const value = useMemo<AuthContextType>(() => ({
    ready, access, refresh,
    async login(id: string, password: string) {
      const tokens = await apiLogin({ username: id.trim(), password } as any);
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
    async register(username, email, password) {
      const out = await apiRegister({ username: username.trim(), email: email.trim(), password });
      setAccess(out.access); setRefresh(out.refresh);
      setAuthHelpers(() => out.access, () => Promise.resolve(true));
    },
    logout() { setAccess(null); setRefresh(null); },
  }), [ready, access, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
