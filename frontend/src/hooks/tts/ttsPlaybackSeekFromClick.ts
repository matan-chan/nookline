import {
  buildPdfJoinedFromPageTextContent,
  charOffsetForPdfItemIndex,
  epubParagraphIndexForDomTarget,
  extractEpubParagraphs,
  mapPresentationDomIndexToItemIndex,
  materializePdfStreamSession,
} from "../../utils/readerText";
import type { TtsChunkLimits } from "../../utils/readerText/constants";
import type { PdfMarginStripOptsRef } from "./useTtsParagraphPlaybackPlay";
import { previewOf } from "./ttsPlaybackConstants";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

type PdfSeekCtx = {
  format: "epub" | "pdf";
  pdfMarginStripOptsRef: PdfMarginStripOptsRef;
  chunkLimitsRef: MutableRefObject<TtsChunkLimits>;
  openAiPanel?: () => void;
  stopPlayback: () => void;
  pdfDocRef: MutableRefObject<PDFDocumentProxy | null>;
  pdfNavigateRef?: MutableRefObject<((page: number) => void) | null>;
  pdfPageRef: MutableRefObject<number>;
  parasRef: MutableRefObject<string[]>;
  anchorRef: MutableRefObject<string>;
  epubHighlightElsRef: MutableRefObject<(HTMLElement | null)[][]>;
  pdfParaItemIndicesRef: MutableRefObject<number[][]>;
  pdfSessionPageRef: MutableRefObject<number | null>;
  urlCurRef: MutableRefObject<string | null>;
  flushServerReadingRef: MutableRefObject<(opts?: { pdfPage?: number }) => void>;
  fetchSpeechBlob: (text: string, signal?: AbortSignal) => Promise<Blob>;
  playAudioFromUrl: (url: string) => void;
  prefetchAt: (i: number) => void;
  revoke: (u: string | null) => void;
  setErr: (v: string | null) => void;
  setPdfHighlightPage: Dispatch<SetStateAction<number | null>>;
  setTotalParas: Dispatch<SetStateAction<number>>;
  indexRef: MutableRefObject<number>;
  setParaIndex: Dispatch<SetStateAction<number>>;
  setPreview: Dispatch<SetStateAction<string>>;
  setPdfHighlightItemIndices: Dispatch<SetStateAction<number[]>>;
  setPdfTextLayerTick: Dispatch<SetStateAction<number>>;
  setBusy: (v: boolean) => void;
};

export const runSeekFromPdfClick = async (ctx: PdfSeekCtx, page: number, textPresentationIndex: number) => {
  ctx.openAiPanel?.();
  if (ctx.format !== "pdf") return;
  ctx.setErr(null);
  const doc = ctx.pdfDocRef.current;
  const nav = ctx.pdfNavigateRef?.current;
  if (!doc) return;
  ctx.stopPlayback();
  const p = Math.max(1, Math.min(doc.numPages, Math.floor(page)));
  if (p !== ctx.pdfPageRef.current && nav) {
    nav(p);
    ctx.pdfPageRef.current = p;
    await new Promise((r) => setTimeout(r, 360));
  } else ctx.pdfPageRef.current = p;
  let joined;
  let tc: { items: readonly unknown[] };
  try {
    const pageObj = await doc.getPage(p);
    tc = await pageObj.getTextContent();
    const { enabled, regexes } = ctx.pdfMarginStripOptsRef.current;
    const pdfOpts = enabled && regexes.length > 0 ? { marginLineRegexes: regexes } : undefined;
    joined = buildPdfJoinedFromPageTextContent(p, tc, pdfOpts);
  } catch {
    ctx.setErr("Could not read this page.");
    return;
  }
  if (!joined) {
    ctx.setErr("No extractable text on this page.");
    return;
  }
  const pdfItemIndex = mapPresentationDomIndexToItemIndex(tc.items, textPresentationIndex);
  const clickCharOffset = charOffsetForPdfItemIndex(joined.spans, pdfItemIndex);
  const { paragraphs, paraItemIndices } = materializePdfStreamSession(
    joined.full,
    joined.spans,
    clickCharOffset,
    ctx.chunkLimitsRef.current,
  );
  if (!paragraphs.length) {
    ctx.setErr("No extractable text on this page.");
    return;
  }
  const start = 0;
  ctx.parasRef.current = paragraphs;
  ctx.anchorRef.current = joined.anchor;
  ctx.epubHighlightElsRef.current = [];
  ctx.pdfParaItemIndicesRef.current = paraItemIndices;
  ctx.pdfSessionPageRef.current = ctx.pdfPageRef.current;
  ctx.setPdfHighlightPage(ctx.pdfPageRef.current);
  ctx.setTotalParas(paragraphs.length);
  ctx.indexRef.current = start;
  ctx.setParaIndex(start);
  ctx.setPreview(previewOf(paragraphs[start]));
  ctx.flushServerReadingRef.current({ pdfPage: p });
  ctx.setPdfHighlightItemIndices(paraItemIndices[start] ?? []);
  ctx.setPdfTextLayerTick((t) => t + 1);
  ctx.setBusy(true);
  try {
    const blob = await ctx.fetchSpeechBlob(paragraphs[start]);
    ctx.revoke(ctx.urlCurRef.current);
    ctx.urlCurRef.current = URL.createObjectURL(blob);
    ctx.playAudioFromUrl(ctx.urlCurRef.current);
    ctx.prefetchAt(start + 1);
  } catch (e) {
    ctx.setErr(e instanceof Error ? e.message : "TTS failed");
  } finally {
    ctx.setBusy(false);
  }
};

type EpubSeekCtx = PdfSeekCtx & { renditionRef: MutableRefObject<Rendition | null> };

export const runSeekFromEpubClick = async (ctx: EpubSeekCtx, target: Node) => {
  ctx.openAiPanel?.();
  if (ctx.format !== "epub") return;
  ctx.setErr(null);
  const r = ctx.renditionRef.current;
  if (!r) return;
  let extracted;
  try {
    extracted = await extractEpubParagraphs(r, ctx.chunkLimitsRef.current);
  } catch {
    ctx.setErr("Could not read this chapter.");
    return;
  }
  if (!extracted.paragraphs.length) {
    ctx.setErr("No extractable text on this page/section.");
    return;
  }
  const start = epubParagraphIndexForDomTarget(extracted.highlightEls, target);
  if (start == null) {
    ctx.setErr("Tap a paragraph to read.");
    return;
  }
  ctx.stopPlayback();
  ctx.parasRef.current = extracted.paragraphs;
  ctx.anchorRef.current = extracted.anchor;
  ctx.epubHighlightElsRef.current =
    "highlightEls" in extracted && extracted.highlightEls ? extracted.highlightEls : extracted.paragraphs.map(() => []);
  ctx.pdfParaItemIndicesRef.current = [];
  ctx.pdfSessionPageRef.current = null;
  ctx.setPdfHighlightPage(null);
  ctx.setPdfHighlightItemIndices([]);
  ctx.setTotalParas(extracted.paragraphs.length);
  ctx.indexRef.current = start;
  ctx.setParaIndex(start);
  ctx.setPreview(previewOf(extracted.paragraphs[start]));
  ctx.flushServerReadingRef.current();
  ctx.setBusy(true);
  try {
    const blob = await ctx.fetchSpeechBlob(extracted.paragraphs[start]);
    ctx.revoke(ctx.urlCurRef.current);
    ctx.urlCurRef.current = URL.createObjectURL(blob);
    ctx.playAudioFromUrl(ctx.urlCurRef.current);
    ctx.prefetchAt(start + 1);
  } catch (e) {
    ctx.setErr(e instanceof Error ? e.message : "TTS failed");
  } finally {
    ctx.setBusy(false);
  }
};
