import { createHmac, timingSafeEqual } from "node:crypto";

const signingSecretFromEnv = () =>
  process.env.JWT_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || "";

const WEAK_SIGNING_SECRETS = new Set(
  ["local-dev-only-replace-with-a-long-random-secret", "nookline-dev-auth-secret-change-in-production", "changeme", "secret"].map(
    (x) => x.toLowerCase(),
  ),
);

export const assertProductionSigningSecret = () => {
  if (process.env.NODE_ENV !== "production") return;
  const s = signingSecretFromEnv();
  if (s.length < 32 || WEAK_SIGNING_SECRETS.has(s.toLowerCase())) {
    console.error(
      "Fatal: JWT_SECRET or AUTH_SECRET must be a strong random value (≥32 chars, not a known placeholder). Refusing to start in production.",
    );
    process.exit(1);
  }
};

const secret = () => {
  const s = signingSecretFromEnv();
  if (s.length >= 16) return s;
  return "nookline-dev-auth-secret-change-in-production";
};

type TokenPayload = { sub: number; adm: boolean; exp: number };

const toB64 = (obj: TokenPayload) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
const fromB64 = (s: string): TokenPayload | null => {
  try {
    const o = JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as TokenPayload;
    if (typeof o.sub === "number" && typeof o.adm === "boolean" && typeof o.exp === "number") return o;
    return null;
  } catch {
    return null;
  }
};

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export const createAuthToken = (userId: number, isAdmin: boolean, ttlMs: number) => {
  const exp = Date.now() + ttlMs;
  const p: TokenPayload = { sub: userId, adm: isAdmin, exp };
  const body = toB64(p);
  return `${body}.${sign(body)}`;
};

export const verifyAuthToken = (raw: string | undefined | null): TokenPayload | null => {
  if (raw == null || raw.length < 20) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const body = raw.slice(0, i);
  const mac = raw.slice(i + 1);
  const want = sign(body);
  if (mac.length !== want.length) return null;
  const a = Buffer.from(mac, "utf8");
  const b = Buffer.from(want, "utf8");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  const p = fromB64(body);
  if (p == null) return null;
  if (p.exp < Date.now()) return null;
  return p;
};

export const AUTH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
