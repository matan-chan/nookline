import { basename } from "path";
import { beLog } from "../../utils/beLog";

export type FilenameInference = {
  suggestedTitle: string | null;
  suggestedAuthor: string | null;
};

const AUTHOR_PARTICLES = new Set([
  "de",
  "del",
  "della",
  "di",
  "da",
  "das",
  "dos",
  "du",
  "der",
  "den",
  "la",
  "le",
  "les",
  "el",
  "van",
  "von",
  "st",
  "ste",
  "mac",
  "mc",
]);

const capitalizeWord = (w: string) =>
  w.length === 0 ? w : `${w.charAt(0).toUpperCase()}${w.slice(1).toLowerCase()}`;

const formatTitleFromHyphenParts = (parts: string[]) => parts.map(capitalizeWord).join(" ");

const formatAuthorFromHyphenParts = (parts: string[]) =>
  parts
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i > 0 && AUTHOR_PARTICLES.has(lw)) return lw;
      return capitalizeWord(w);
    })
    .join(" ");

const inferFromCatalogHyphenSlug = (rawSlug: string): FilenameInference | null => {
  const slug = rawSlug.replace(/_/g, "-").replace(/-{2,}/g, "-").trim();
  if (!slug.includes("-")) return null;
  const parts = slug
    .split("-")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length < 3) return null;

  let authorLen = 0;
  if (parts.length >= 5 && AUTHOR_PARTICLES.has(parts[parts.length - 2]!.toLowerCase())) authorLen = 3;
  else if (parts.length >= 4) authorLen = 2;
  else authorLen = 2;

  const titleParts = parts.slice(0, -authorLen);
  const authorParts = parts.slice(-authorLen);
  if (titleParts.length === 0 || authorParts.length === 0) return null;

  return {
    suggestedTitle: formatTitleFromHyphenParts(titleParts),
    suggestedAuthor: formatAuthorFromHyphenParts(authorParts),
  };
};

export const stripLeadingOpaqueSlugPrefix = (slug: string): string => {
  const compact = slug.trim().replace(/\s+/g, "");
  const hashNum = /^[a-z0-9]{8,}-\d+-(.+)$/i.exec(compact);
  if (hashNum?.[1]) return hashNum[1];
  const digits = /^\d+-(.+)$/.exec(compact);
  if (digits?.[1]) return digits[1];
  return slug.trim();
};

export const titleLooksLikeRawFilename = (title: string, slug: string) => {
  beLog("titleLooksLikeRawFilename");
  const nt = normalizeLoose(title);
  const ns = normalizeLoose(slug);
  if (nt === ns) return true;
  if (/^pg\s*\d/i.test(title)) return true;
  if (/\bimages\s+\d+\s*$/i.test(title)) return true;
  if (title.trim().length < 6 && slug.replace(/[^a-z0-9]/gi, "").length > 8) return true;
  return false;
};

export const inferFromFilenameSlug = (slug: string): FilenameInference => {
  let s = slug.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return { suggestedTitle: null, suggestedAuthor: null };

  const pg = /^pg\s*(\d+)/i.exec(s);
  if (pg) return { suggestedTitle: `Project Gutenberg eBook #${pg[1]}`, suggestedAuthor: null };

  s = s.replace(/\s+images\s+\d+\s*$/i, "").trim();

  const spacedDash = /\s[-–—]\s/.test(s);
  if (!spacedDash && /-/.test(s.replace(/\s+/g, ""))) {
    const compactHyphenSlug = s.replace(/\s+/g, "");
    const hyphenGuess =
      inferFromCatalogHyphenSlug(stripLeadingOpaqueSlugPrefix(compactHyphenSlug)) ??
      inferFromCatalogHyphenSlug(compactHyphenSlug);
    if (hyphenGuess?.suggestedAuthor && hyphenGuess?.suggestedTitle) return hyphenGuess;
  }

  let m = /^(.{2,80}?)\s*[-–—]\s+(.{2,200})$/.exec(s);
  if (m) return { suggestedAuthor: m[1].trim(), suggestedTitle: m[2].trim() };

  m = /^(.{2,200}?)\s+by\s+(.{2,80})$/i.exec(s);
  if (m) return { suggestedTitle: m[1].trim(), suggestedAuthor: m[2].trim() };

  m = /^\[(.+?)\]\s*(.+)$/.exec(s);
  if (m && m[2].trim().length > 2) return { suggestedAuthor: m[1].trim(), suggestedTitle: m[2].trim() };

  return { suggestedTitle: s || null, suggestedAuthor: null };
};

export const stripUploadTimestamp = (filePath: string) => {
  const base = basename(filePath);
  const m = /^\d+_(.+)$/.exec(base);
  return (m ? m[1] : base).replace(/\.(pdf|epub)$/i, "");
};

export const findOpfItemHrefById = (opf: string, itemId: string): string | null => {
  const re = /<item\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(opf))) {
    const block = m[1];
    const idM = /\bid\s*=\s*["']([^"']+)["']/i.exec(block);
    if (idM?.[1] !== itemId) continue;
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(block);
    if (hrefM) return hrefM[1];
  }
  return null;
};

export const resolveZipPath = (opfPath: string, href: string) => {
  const dec = href.split("/").map((p) => decodeURIComponent(p)).join("/");
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  return (opfDir + dec).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\//, "");
};

export const findZipEntryKey = (zipFiles: Record<string, { dir?: boolean }>, target: string) => {
  const norm = target.replace(/\\/g, "/").replace(/^\//, "").toLowerCase();
  const keys = Object.keys(zipFiles).filter((k) => !zipFiles[k]?.dir);
  const exact = keys.find((k) => k.replace(/^\//, "").toLowerCase() === norm);
  if (exact) return exact;
  return keys.find((k) => k.replace(/^\//, "").toLowerCase().endsWith(norm)) ?? null;
};

const normalizeLoose = (s: string) =>
  s
    .toLowerCase()
    .replace(/\.(pdf|epub)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
