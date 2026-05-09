import type { APIRequestContext } from "@playwright/test";

const getE2eBypassToken = async (request: APIRequestContext) => {
  const key = process.env.E2E_AUTH_KEY?.trim() ?? "";
  const r = await request
    .post("/api/auth/e2e-token", { headers: key ? { "x-e2e-key": key } : undefined })
    .catch(() => null);
  if (!r?.ok()) return null;

  const j = (await r.json().catch(() => null)) as { user?: { token?: string } } | null;
  const tok = j?.user?.token;
  if (typeof tok !== "string" || tok.length < 10) return null;
  return tok;
};

export const getAuthToken = async (request: APIRequestContext) => {
  const boot = await request.get("/api/auth/bootstrap").then((r) => (r.ok() ? r.json() : null)).catch(() => null);
  const needsFirstUser = Boolean(boot?.needsFirstUser);
  if (needsFirstUser) {
    const username = `e2e_${Math.random().toString(36).slice(2, 10)}`;
    const password = `E2e_${Math.random().toString(36).slice(2, 10)}!Aa1`;
    const r = await request.post("/api/auth/register", { data: { username, password } });
    const j = (await r.json().catch(() => null)) as { user?: { token?: string }; error?: string };
    const tok = j?.user?.token;
    if (!r.ok() || typeof tok !== "string" || tok.length < 10) throw new Error(`register failed: ${j?.error ?? r.status()}`);
    return tok;
  }

  const username = process.env.E2E_USERNAME?.trim() ?? "";
  const password = process.env.E2E_PASSWORD?.trim() ?? "";
  if (!username || !password) return await getE2eBypassToken(request);

  const r = await request.post("/api/auth/login", { data: { username, password } });
  const j = (await r.json().catch(() => null)) as { user?: { token?: string }; error?: string };
  const tok = j?.user?.token;
  if (!r.ok() || typeof tok !== "string" || tok.length < 10) throw new Error(`login failed: ${j?.error ?? r.status()}`);
  return tok;
};
