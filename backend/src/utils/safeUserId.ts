export const safeUserId = (raw: unknown): number => {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1) return raw;
  const n = parseInt(String(raw ?? "1"), 10);
  if (Number.isInteger(n) && n >= 1) return n;
  return 1;
};
