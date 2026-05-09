import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /\d/;
const SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~]/;

export const hashPassword = async (plain: string) => {
  const salt = randomBytes(16);
  const buf = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${buf.toString("base64")}`;
};

export const verifyPasswordScrypt = async (plain: string, stored: string) => {
  if (!stored.startsWith("scrypt:")) return false;
  const rest = stored.slice(7);
  const i = rest.indexOf(":");
  if (i <= 0) return false;
  const sB = rest.slice(0, i);
  const hB = rest.slice(i + 1);
  const salt = Buffer.from(sB, "base64");
  const want = Buffer.from(hB, "base64");
  const buf = (await scryptAsync(plain, salt, 64)) as Buffer;
  if (buf.length !== want.length) return false;
  return timingSafeEqual(buf, want);
};

export const verifyPassword = async (plain: string, passwordHash: string) => verifyPasswordScrypt(plain, passwordHash);

export const validatePasswordStrength = (plain: string): { ok: boolean; message?: string } => {
  const t = plain.trim();
  if (t.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
  if (t.length > 128) return { ok: false, message: "Password is too long." };
  const classes = [LOWER.test(t), UPPER.test(t), DIGIT.test(t), SPECIAL.test(t)].filter(Boolean).length;
  if (classes < 3) return { ok: false, message: "Use at least three of: lower case, upper case, digits, symbols." };
  return { ok: true };
};
