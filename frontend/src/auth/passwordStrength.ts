const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /\d/;
const SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~]/;

export const passwordScore = (t: string): 0 | 1 | 2 | 3 | 4 => {
  if (t.length === 0) return 0;
  const c = [LOWER.test(t), UPPER.test(t), DIGIT.test(t), SPECIAL.test(t)].filter(Boolean).length;
  let s = 0;
  if (t.length >= 4) s += 1;
  if (t.length >= 8) s += 1;
  if (t.length >= 12) s += 1;
  if (c >= 2) s += 1;
  if (c >= 3) s += 1;
  return Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
};

export const passwordIsStrongEnough = (t: string) => {
  if (t.length < 8) return false;
  const c = [LOWER.test(t), UPPER.test(t), DIGIT.test(t), SPECIAL.test(t)].filter(Boolean).length;
  return c >= 3;
};

/** Meter max is "Good" (3) until `passwordIsStrongEnough` — avoids "Strong" while Create stays disabled. */
export const passwordStrengthMeterTier = (t: string): 0 | 1 | 2 | 3 | 4 => {
  const raw = passwordScore(t);
  if (passwordIsStrongEnough(t)) return raw;
  return Math.min(raw, 3) as 0 | 1 | 2 | 3;
};
