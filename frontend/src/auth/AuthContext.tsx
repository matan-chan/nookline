import { buildAuthHeader, getStoredToken, setStoredToken } from "./authStorage";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = { id: number; username: string; isAdmin: boolean; token: string; hasAvatar?: boolean };

type Ctx = {
  user: AuthUser | null;
  isLoading: boolean;
  needsFirstUser: boolean;
  legacyMigratedAccount: boolean;
  apiUnavailable: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  retryConnection: () => void;
  refreshUser: () => Promise<void>;
};

const AuthState = createContext<Ctx | null>(null);

const apiUrl = (path: string) => (path.startsWith("http") ? path : path);

const fetchBootstrap = () =>
  fetch(apiUrl("/api/auth/bootstrap"), { headers: { Accept: "application/json" } }).then((r) => {
    if (!r.ok) throw new Error("bootstrap");
    return r.json() as Promise<{ needsFirstUser: boolean; legacyMigratedAccount?: boolean }>;
  });

const fetchMe = (token: string) =>
  fetch(apiUrl("/api/auth/me"), { headers: { Accept: "application/json", ...buildAuthHeader(token) } }).then((r) => {
    if (!r.ok) return null;
    return r.json() as Promise<{ user: { id: number; username: string; isAdmin: boolean; hasAvatar?: boolean } | null }>;
  });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsFirstUser, setNeedsFirstUser] = useState(false);
  const [legacyMigratedAccount, setLegacyMigratedAccount] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const syncSession = useCallback(async () => {
    setIsLoading(true);
    setApiUnavailable(false);
    let boot: { needsFirstUser: boolean; legacyMigratedAccount?: boolean };
    try {
      boot = await fetchBootstrap();
    } catch {
      setLegacyMigratedAccount(false);
      setNeedsFirstUser(false);
      setUser(null);
      setIsLoading(false);
      setApiUnavailable(true);
      return;
    }
    setNeedsFirstUser(boot.needsFirstUser);
    setLegacyMigratedAccount(!!boot.legacyMigratedAccount);
    const t = getStoredToken();
    if (t) {
      const m = await fetchMe(t);
      if (m?.user) {
        setUser({ ...m.user, token: t });
        setIsLoading(false);
        return;
      }
      setStoredToken(null);
    }
    setUser(null);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const tok = getStoredToken();
    if (tok == null) return;
    const m = await fetchMe(tok);
    if (m?.user) setUser({ ...m.user, token: tok });
  }, []);

  useEffect(() => {
    void syncSession();
  }, [syncSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const r = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j = (await r.json()) as { error?: string; user?: { id: number; username: string; isAdmin: boolean; token: string; hasAvatar?: boolean } };
      if (!r.ok) throw new Error(j.error ?? "Login failed");
      if (j.user?.token) {
        setStoredToken(j.user.token);
        setUser(j.user);
        setNeedsFirstUser(false);
        setLegacyMigratedAccount(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (username: string, password: string) => {
      const r = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j = (await r.json()) as { error?: string; user?: { id: number; username: string; isAdmin: boolean; token: string; hasAvatar?: boolean } };
      if (!r.ok) throw new Error(j.error ?? "Register failed");
      if (j.user?.token) {
        setStoredToken(j.user.token);
        setUser(j.user);
        setNeedsFirstUser(false);
        setLegacyMigratedAccount(false);
      }
    },
    [],
  );

  const retryConnection = useCallback(() => {
    void syncSession();
  }, [syncSession]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    void fetchBootstrap().then((b) => {
      setNeedsFirstUser(b.needsFirstUser);
      setLegacyMigratedAccount(!!b.legacyMigratedAccount);
    });
  }, []);

  const v = useMemo<Ctx>(
    () => ({ user, isLoading, needsFirstUser, legacyMigratedAccount, apiUnavailable, login, register, logout, retryConnection, refreshUser }),
    [user, isLoading, needsFirstUser, legacyMigratedAccount, apiUnavailable, login, register, logout, retryConnection, refreshUser],
  );

  return <AuthState.Provider value={v}>{children}</AuthState.Provider>;
};

export const useAuth = () => {
  const v = useContext(AuthState);
  if (v == null) throw new Error("useAuth");
  return v;
};

export const useCurrentUserId = () => useAuth().user?.id;
