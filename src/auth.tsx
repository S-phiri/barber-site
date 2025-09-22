import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  refreshTokenApi as apiRefreshToken,
  setAuthHelpers,
} from "@/lib/api";

type AuthContextType = {
  ready: boolean;
  access: string | null;
  refresh: string | null;
  user: any | null;
  login: (id: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
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

  // Fetch user when access token is available AND auth helpers are set
  useEffect(() => {
    if (access && !user) {
      // Import me function dynamically to avoid circular dependency
      import("@/lib/api").then(({ me }) => {
        me().then(setUser).catch(() => setUser(null));
      });
    } else if (!access) {
      setUser(null);
    }
  }, [access, user]);

  const value = useMemo<AuthContextType>(() => ({
    ready, access, refresh, user,
    async login(id: string, password: string) {
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
            setAccess(null); 
            setRefresh(null);
            return false;
          }
        }
      );
    },
    async register(username, email, password) {
      const out = await apiRegister({ username: username.trim(), email: email.trim(), password });
      setAccess(out.access); 
      setRefresh(out.refresh);
      setAuthHelpers(() => out.access, () => Promise.resolve(true));
    },
    logout() { 
      setAccess(null); 
      setRefresh(null); 
      setUser(null);
    },
  }), [ready, access, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}