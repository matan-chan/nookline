import { buildAuthHeader, getStoredToken } from "../../auth/authStorage";
import type { SettingsUserRowModel } from "./SettingsUserListRow";
import { useCallback, useEffect, useState } from "react";
import type { TFunction } from "i18next";

type CreateUserPayload = { username: string; password: string; isAdmin: boolean };

export const useSettingsUsersData = (t: TFunction<"auth">, isAdmin: boolean) => {
  const [rows, setRows] = useState<SettingsUserRowModel[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    const token = getStoredToken();
    if (token == null) {
      setRows([]);
      setLoading(false);
      return;
    }
    const r = await fetch("/api/auth/users", { headers: { Accept: "application/json", ...buildAuthHeader(token) } });
    if (!r.ok) {
      setLoadErr(t("loadUsersFailed"));
      setRows([]);
      setLoading(false);
      return;
    }
    const j = (await r.json()) as { users?: SettingsUserRowModel[] };
    setRows(j.users ?? []);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (isAdmin) void loadUsers();
  }, [isAdmin, loadUsers]);

  const createUser = async (payload: CreateUserPayload): Promise<{ ok: true } | { ok: false; error: string }> => {
    const token = getStoredToken();
    if (token == null) return { ok: false, error: t("userCreateFailed") };
    try {
      const r = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...buildAuthHeader(token) },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) return { ok: false, error: j.error ?? t("userCreateFailed") };
      void loadUsers();
      return { ok: true };
    } catch {
      return { ok: false, error: t("userCreateFailed") };
    }
  };

  const deleteUser = async (id: number): Promise<{ ok: true } | { ok: false; error: string }> => {
    const token = getStoredToken();
    if (token == null) return { ok: false, error: t("deleteUserFailed") };
    try {
      const r = await fetch(`/api/auth/users/${id}`, { method: "DELETE", headers: { Accept: "application/json", ...buildAuthHeader(token) } });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: j.error ?? t("deleteUserFailed") };
      }
      void loadUsers();
      return { ok: true };
    } catch {
      return { ok: false, error: t("deleteUserFailed") };
    }
  };

  return { rows, loadErr, setLoadErr, loading, createUser, deleteUser };
};
