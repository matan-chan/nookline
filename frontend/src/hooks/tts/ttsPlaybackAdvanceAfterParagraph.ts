import { extractPdfParagraphs } from "../../utils/readerText";
import type { TtsChunkLimits } from "../../utils/readerText/constants";
import type { PdfMarginStripOptsRef } from "./useTtsParagraphPlaybackPlay";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { previewOf } from "./ttsPlaybackConstants";

export type AdvanceAfterParagraphCtx = {
  format: "epub" | "pdf";
  pdfMarginStripOptsRef: PdfMarginStripOptsRef;
  chunkLimitsRef: MutableRefObject<TtsChunkLimits>;
  parasRef: MutableRefObject<string[]>;
  indexRef: MutableRefObject<number>;
  anchorRef: MutableRefObject<string>;
  pdfDocRef: MutableRefObject<PDFDocumentProxy | null>;
  pdfNavigateRef?: MutableRefObject<((page: number) => void) | null>;
  pdfPageRef: MutableRefObject<number>;
  pdfParaItemIndicesRef: MutableRefObject<number[][]>;
  pdfSessionPageRef: MutableRefObject<number | null>;
  urlCurRef: MutableRefObject<string | null>;
  urlNextRef: MutableRefObject<string | null>;
  flushServerReadingRef: MutableRefObject<(opts?: { pdfPage?: number }) => void>;
  fetchSpeechBlob: (text: string, signal?: AbortSignal) => Promise<Blob>;
  playAudioFromUrl: (url: string) => void;
  prefetchAt: (i: number) => void;
  clearAudioOnly: () => void;
  revoke: (u: string | null) => void;
  setBusy: (v: boolean) => void;
  setErr: (v: string) => void;
  setParaIndex: Dispatch<SetStateAction<number>>;
  setTotalParas: Dispatch<SetStateAction<number>>;
  setPreview: Dispatch<SetStateAction<string>>;
  setPdfHighlightPage: Dispatch<SetStateAction<number | null>>;
  setPdfHighlightItemIndices: Dispatch<SetStateAction<number[]>>;
  setPdfTextLayerTick: Dispatch<SetStateAction<number>>;
};

export const createAdvanceAfterParagraphHandler = (ctx: AdvanceAfterParagraphCtx) => () => {
  const paras = ctx.parasRef.current;
  const nextIdx = ctx.indexRef.current + 1;
  if (nextIdx >= paras.length) {
    const doc = ctx.pdfDocRef.current;
    const nav = ctx.pdfNavigateRef?.current;
    if (ctx.format === "pdf" && doc && nav && ctx.pdfPageRef.current < doc.numPages) {
      ctx.setBusy(true);
      void (async () => {
        ctx.clearAudioOnly();
        let targetPage = ctx.pdfPageRef.current + 1;
        while (targetPage <= doc.numPages) {
          nav(targetPage);
          ctx.pdfPageRef.current = targetPage;
          await new Promise((r) => setTimeout(r, 340));
          let extracted;
          try {
            const { enabled, regexes } = ctx.pdfMarginStripOptsRef.current;
            const pdfOpts = enabled && regexes.length > 0 ? { marginLineRegexes: regexes } : undefined;
            extracted = await extractPdfParagraphs(doc, targetPage, ctx.chunkLimitsRef.current, pdfOpts);
          } catch {
            ctx.setBusy(false);
            return;
          }
          if (extracted.paragraphs.length > 0) {
            ctx.parasRef.current = extracted.paragraphs;
            ctx.anchorRef.current = extracted.anchor;
            ctx.pdfParaItemIndicesRef.current = extracted.paraItemIndices ?? [];
            ctx.pdfSessionPageRef.current = targetPage;
            ctx.setPdfHighlightPage(targetPage);
            ctx.setTotalParas(extracted.paragraphs.length);
            ctx.indexRef.current = 0;
            ctx.setParaIndex(0);
            ctx.setPreview(previewOf(extracted.paragraphs[0]));
            ctx.flushServerReadingRef.current({ pdfPage: targetPage });
            ctx.setPdfHighlightItemIndices(ctx.pdfParaItemIndicesRef.current[0] ?? []);
            ctx.setPdfTextLayerTick((t) => t + 1);
            try {
              const blob = await ctx.fetchSpeechBlob(extracted.paragraphs[0]);
              ctx.revoke(ctx.urlCurRef.current);
              ctx.urlCurRef.current = URL.createObjectURL(blob);
              ctx.playAudioFromUrl(ctx.urlCurRef.current);
              ctx.prefetchAt(1);
            } catch (e) {
              ctx.setErr(e instanceof Error ? e.message : "TTS failed");
            } finally {
              ctx.setBusy(false);
            }
            return;
          }
          targetPage += 1;
        }
        ctx.setBusy(false);
      })();
      return;
    }
    ctx.setBusy(false);
    return;
  }
  ctx.indexRef.current = nextIdx;
  ctx.setParaIndex(nextIdx);
  ctx.flushServerReadingRef.current();
  ctx.setPreview(previewOf(paras[nextIdx]));
  ctx.setPdfHighlightItemIndices(ctx.pdfParaItemIndicesRef.current[nextIdx] ?? []);

  const readyNext = ctx.urlNextRef.current;
  ctx.revoke(ctx.urlCurRef.current);
  ctx.urlCurRef.current = readyNext;
  ctx.urlNextRef.current = null;

  if (ctx.urlCurRef.current) ctx.playAudioFromUrl(ctx.urlCurRef.current);
  else {
    ctx.setBusy(true);
    ctx
      .fetchSpeechBlob(paras[nextIdx])
      .then((blob) => {
        ctx.revoke(ctx.urlCurRef.current);
        ctx.urlCurRef.current = URL.createObjectURL(blob);
        ctx.playAudioFromUrl(ctx.urlCurRef.current);
      })
      .catch((e) => ctx.setErr(e instanceof Error ? e.message : "TTS failed"))
      .finally(() => ctx.setBusy(false));
  }
  ctx.prefetchAt(nextIdx + 1);
};
