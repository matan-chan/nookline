const textFromMaybe = (raw: unknown): string | null => {
  if (raw == null) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const d = textFromMaybe(item);
      if (d) return d;
    }
    return null;
  }
  if (typeof raw === "object" && raw !== null && "value" in raw) return textFromMaybe((raw as { value: unknown }).value);
  return null;
};

const subjectList = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string");
};

export const pickBookDescription = (metadata: Record<string, unknown>): string | null => {
  const ol = metadata.openLibrary as Record<string, unknown> | undefined;
  const fromOl = ol ? textFromMaybe(ol.description) : null;
  return fromOl || textFromMaybe(metadata.description) || null;
};

export const pickBookSubjectTags = (metadata: Record<string, unknown>, cap: number): string[] => {
  const ol = metadata.openLibrary as Record<string, unknown> | undefined;
  const subjects = ol ? subjectList(ol.subjects) : [];
  if (subjects.length) return subjects.slice(0, cap).map((s) => s.toUpperCase());
  const g = metadata.genre;
  if (typeof g === "string" && g.trim()) return [g.trim().toUpperCase()];
  return [];
};

export const pickBookRatings = (
  metadata: Record<string, unknown>,
): { average: number; count: number } | null => {
  const ol = metadata.openLibrary as Record<string, unknown> | undefined;
  if (!ol) return null;
  const avg = ol.ratingsAverage;
  const count = ol.ratingsCount;
  const hasAvg = typeof avg === "number" && !Number.isNaN(avg);
  if (!hasAvg) return null;
  const hasCount = typeof count === "number" && count > 0;
  return { average: avg, count: hasCount ? count : 0 };
};
