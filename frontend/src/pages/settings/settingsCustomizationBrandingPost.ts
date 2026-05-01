import { getStoredToken } from "../../auth/authStorage";

export const postBrandingForm = async (path: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  const t = getStoredToken();
  const r = await fetch(path, { method: "POST", body: fd, headers: t ? { Authorization: `Bearer ${t}` } : undefined });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(txt || String(r.status));
  }
  return r.json() as Promise<{ url?: string }>;
};
