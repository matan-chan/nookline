import { inferFromFilenameSlug, stripUploadTimestamp, titleLooksLikeRawFilename, type FilenameInference } from "./bookFilenameInference";
import { extractPdfEmbeddedMetadata } from "./pdfEmbeddedMetadata";
import type { PdfPlainTextGuess } from "./pdfFirstPageTextInference";
import { beLogErr } from "../utils/beLog";

export type PdfEmbeddedMeta = { title: string | null; author: string | null };

const PDF_EXT = ".pdf";

export const emptyPdfGuess = (): PdfPlainTextGuess => ({ title: null, author: null });

export const parseMeta = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : null;
  } catch (e) {
    beLogErr("parseMeta_bookLocalFallback", e);
    return null;
  }
};

export const buildFilenameInference = (absFilePath: string, bookTitle: string) => {
  const slug = stripUploadTimestamp(absFilePath);
  const inferred = inferFromFilenameSlug(slug);
  const repairTitle = titleLooksLikeRawFilename(bookTitle, slug);
  return { slug, inferred, repairTitle };
};

export const loadPdfEmbeddedMetadataIfPdf = async (ext: string, absFilePath: string, fileSize: number): Promise<PdfEmbeddedMeta> => {
  if (ext === PDF_EXT) return extractPdfEmbeddedMetadata(absFilePath, fileSize);
  return { title: null, author: null };
};

export const pickFallbackAuthor = (
  meta: Record<string, unknown> | null,
  pdfEmb: PdfEmbeddedMeta,
  pdfText: PdfPlainTextGuess,
  inferred: FilenameInference,
): string | null => {
  const hasAuthor = typeof meta?.author === "string" && meta.author.trim().length > 0;
  if (hasAuthor) return null;
  const a = pdfEmb.author?.trim() || pdfText.author?.trim() || inferred.suggestedAuthor?.trim();
  return a || null;
};

export const pickRepairedTitle = (
  repairTitle: boolean,
  pdfEmb: PdfEmbeddedMeta,
  pdfText: PdfPlainTextGuess,
  inferred: FilenameInference,
): string | null => {
  if (!repairTitle) return null;
  const fromPdf = pdfEmb.title?.trim();
  if (fromPdf) return fromPdf;
  const fromPageText = pdfText.title?.trim();
  if (fromPageText) return fromPageText;
  return inferred.suggestedTitle ?? null;
};

export const mergeLocalFallbackIntoMetadata = (
  meta: Record<string, unknown> | null,
  slug: string,
  inferred: FilenameInference,
  nextAuthor: string | null,
  newCoverPath: string | null,
  pdfTextGuess: PdfPlainTextGuess,
): Record<string, unknown> => {
  const prevLf = meta?.localFallback && typeof meta.localFallback === "object" ? meta.localFallback : {};
  const now = new Date().toISOString();
  const pdfTxt =
    pdfTextGuess.title || pdfTextGuess.author
      ? {
          ...(pdfTextGuess.title ? { title: pdfTextGuess.title } : {}),
          ...(pdfTextGuess.author ? { author: pdfTextGuess.author } : {}),
        }
      : null;
  return {
    ...(meta ?? {}),
    ...(nextAuthor ? { author: nextAuthor } : {}),
    localFallback: {
      ...(prevLf as object),
      appliedAt: now,
      filenameSlug: slug,
      inferredTitle: inferred.suggestedTitle,
      inferredAuthor: inferred.suggestedAuthor,
      ...(pdfTxt ? { pdfFirstPageText: pdfTxt } : {}),
      ...(newCoverPath ? { coverFromFirstPage: true, coverGeneratedAt: now } : {}),
    },
  };
};
