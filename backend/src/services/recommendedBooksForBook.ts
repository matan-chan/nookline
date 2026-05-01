import type { Book } from "@prisma/client";

type Meta = Record<string, unknown>;

export const parseBookMetadata = (raw: string | null): Meta => {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Meta;
  } catch {
    return {};
  }
};

const norm = (s: string) => s.trim().toLowerCase();

const authorFrom = (m: Meta): string | null => {
  if (typeof m.author !== "string") return null;
  const t = m.author.trim();
  return t ? norm(t) : null;
};

const genreFrom = (m: Meta): string | null => {
  if (typeof m.genre !== "string") return null;
  const t = m.genre.trim();
  return t ? norm(t) : null;
};

const subjectsFrom = (m: Meta): string[] => {
  const ol = m.openLibrary as Record<string, unknown> | undefined;
  if (!ol || !Array.isArray(ol.subjects)) return [];
  return ol.subjects.filter((x): x is string => typeof x === "string").map((s) => norm(s));
};

const hasAnySignal = (m: Meta) => Boolean(authorFrom(m) || genreFrom(m) || subjectsFrom(m).length);

export const scoreBookAgainstSource = (sourceMeta: Meta, candidateMeta: Meta): number => {
  let score = 0;
  const sa = authorFrom(sourceMeta);
  const ca = authorFrom(candidateMeta);
  if (sa && ca && sa === ca) score += 100;
  const sg = genreFrom(sourceMeta);
  const cg = genreFrom(candidateMeta);
  if (sg && cg && sg === cg) score += 50;
  const srcSubjects = subjectsFrom(sourceMeta);
  if (srcSubjects.length) {
    const set = new Set(srcSubjects);
    for (const s of subjectsFrom(candidateMeta))
      if (set.has(s)) {
        score += 10;
        break;
      }
  }
  return score;
};

export const pickRecommendedBookIds = (
  sourceMeta: Meta,
  pool: Pick<Book, "id" | "metadata">[],
  sourceBookId: number,
  limit: number,
): number[] => {
  if (!hasAnySignal(sourceMeta)) return [];
  type Row = { id: number; score: number };
  const rows: Row[] = [];
  for (const b of pool) {
    if (b.id === sourceBookId) continue;
    const score = scoreBookAgainstSource(sourceMeta, parseBookMetadata(b.metadata));
    if (score === 0) continue;
    rows.push({ id: b.id, score });
  }
  rows.sort((a, b) => b.score - a.score || b.id - a.id);
  const out: number[] = [];
  const seen = new Set<number>();
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r.id);
    if (out.length >= limit) break;
  }
  return out;
};
