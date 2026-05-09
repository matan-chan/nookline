import { existsSync, readFileSync } from "node:fs";
import { E2E_AUTH_STORAGE } from "../constants";

type StorageStateShape = {
  origins?: { localStorage?: { name: string; value: string }[] }[];
};

export const loadStoredE2eToken = () => {
  if (!existsSync(E2E_AUTH_STORAGE)) return null;
  try {
    const raw = readFileSync(E2E_AUTH_STORAGE, "utf8");
    const j = JSON.parse(raw) as StorageStateShape;
    const ls = j.origins?.[0]?.localStorage;
    const row = ls?.find((e) => e.name === "nookline_auth_token");
    const v = row?.value;
    if (typeof v !== "string" || v.length < 10) return null;
    return v;
  } catch {
    return null;
  }
};
