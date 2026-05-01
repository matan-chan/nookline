import type { TtsChunkLimits } from "../../utils/readerText/constants";
import { extractEpubParagraphs, extractPdfParagraphs } from "../../utils/readerText";
import { previewOf } from "./ttsPlaybackConstants";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";
import { useCallback, type MutableRefObject } from "react";

export type PdfMarginStripOptsRef = MutableRefObject<{ enabled: boolean; regexes: string[] }>;

type PlayArgs = {
  format: "epub" | "pdf";
  renditionRef: MutableRefObject<Rendition | null>;
  pdfDocRef: MutableRefObject<PDFDocumentProxy | null>;
  pdfPageRef: MutableRefObject<number>;
  parasRef: MutableRefObject<string[]>;
  anchorRef: MutableRefObject<string>;
  epubHighlightElsRef: MutableRefObject<(HTMLElement | null)[][]>;
  pdfParaItemIndicesRef: MutableRefObject<number[][]>;
  pdfSessionPageRef: MutableRefObject<number | null>;
  indexRef: MutableRefObject<number>;
  urlCurRef: MutableRefObject<string | null>;
  flushServerReadingRef: MutableRefObject<(opts?: { pdfPage?: number }) => void>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  playingRef: MutableRefObject<boolean>;
  fetchSpeechBlob: (text: string, signal?: AbortSignal) => Promise<Blob>;
  playAudioFromUrl: (url: string) => void;
  prefetchAt: (i: number) => void;
  stopPlayback: () => void;
  revoke: (u: string | null) => void;
  setErr: (v: string | null) => void;
  setTotalParas: (v: number) => void;
  setParaIndex: (v: number) => void;
  setPreview: (v: string) => void;
  setPdfHighlightPage: (v: number | null) => void;
  setPdfHighlightItemIndices: (v: number[]) => void;
  setBusy: (v: boolean) => void;
  setPlaying: (v: boolean) => void;
  chunkLimitsRef: MutableRefObject<TtsChunkLimits>;
  pdfMarginStripOptsRef: PdfMarginStripOptsRef;
};

export const useTtsParagraphPlaybackPlay = ({
  format,
  renditionRef,
  pdfDocRef,
  pdfPageRef,
  parasRef,
  anchorRef,
  epubHighlightElsRef,
  pdfParaItemIndicesRef,
  pdfSessionPageRef,
  indexRef,
  urlCurRef,
  flushServerReadingRef,
  audioRef,
  playingRef,
  fetchSpeechBlob,
  playAudioFromUrl,
  prefetchAt,
  stopPlayback,
  revoke,
  setErr,
  setTotalParas,
  setParaIndex,
  setPreview,
  setPdfHighlightPage,
  setPdfHighlightItemIndices,
  setBusy,
  setPlaying,
  chunkLimitsRef,
  pdfMarginStripOptsRef,
}: PlayArgs) => {
  const loadSource = useCallback(async () => {
    const lim = chunkLimitsRef.current;
    if (format === "epub") {
      const r = renditionRef.current;
      if (!r) return null;
      return extractEpubParagraphs(r, lim);
    }
    const doc = pdfDocRef.current;
    const page = pdfPageRef.current || 1;
    if (!doc) return null;
    const { enabled, regexes } = pdfMarginStripOptsRef.current;
    const pdfOpts = enabled && regexes.length > 0 ? { marginLineRegexes: regexes } : undefined;
    return extractPdfParagraphs(doc, page, lim, pdfOpts);
  }, [format, renditionRef, pdfDocRef, pdfPageRef, chunkLimitsRef, pdfMarginStripOptsRef]);

  const beginPlayback = useCallback(async () => {
    setErr(null);
    const extracted = await loadSource();
    if (!extracted) {
      setErr(format === "epub" ? "EPUB not ready" : "PDF not ready");
      return;
    }
    const { paragraphs: paras, anchor: anc } = extracted;
    if (paras.length === 0) {
      setErr("No extractable text on this page/section.");
      return;
    }
    stopPlayback();
    parasRef.current = paras;
    anchorRef.current = anc;
    if (format === "epub") {
      epubHighlightElsRef.current =
        "highlightEls" in extracted && extracted.highlightEls ? extracted.highlightEls : paras.map(() => []);
    } else {
      epubHighlightElsRef.current = [];
      pdfParaItemIndicesRef.current =
        "paraItemIndices" in extracted && extracted.paraItemIndices ? extracted.paraItemIndices : [];
      pdfSessionPageRef.current = pdfPageRef.current;
      setPdfHighlightPage(pdfPageRef.current);
    }
    setTotalParas(paras.length);
    const start = 0;
    indexRef.current = start;
    setParaIndex(start);
    setPreview(previewOf(paras[start]));
    flushServerReadingRef.current();
    if (format === "pdf") setPdfHighlightItemIndices(pdfParaItemIndicesRef.current[start] ?? []);

    setBusy(true);
    try {
      const blob = await fetchSpeechBlob(paras[start]);
      revoke(urlCurRef.current);
      urlCurRef.current = URL.createObjectURL(blob);
      playAudioFromUrl(urlCurRef.current);
      prefetchAt(start + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "TTS failed");
    } finally {
      setBusy(false);
    }
  }, [format, loadSource, fetchSpeechBlob, playAudioFromUrl, prefetchAt, stopPlayback]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (a && !a.paused && playingRef.current) {
      a.pause();
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    if (a && a.paused && parasRef.current.length > 0) {
      void a.play();
      playingRef.current = true;
      setPlaying(true);
      return;
    }
    void beginPlayback();
  }, [beginPlayback]);

  const goParagraph = useCallback(
    (delta: number) => {
      const paras = parasRef.current;
      if (!paras.length) return;
      stopPlayback();
      const ni = Math.min(paras.length - 1, Math.max(0, indexRef.current + delta));
      indexRef.current = ni;
      setParaIndex(ni);
      flushServerReadingRef.current();
      setPreview(previewOf(paras[ni]));
      setPdfHighlightItemIndices(pdfParaItemIndicesRef.current[ni] ?? []);
      setBusy(true);
      setErr(null);
      fetchSpeechBlob(paras[ni])
        .then((blob) => {
          revoke(urlCurRef.current);
          urlCurRef.current = URL.createObjectURL(blob);
          playAudioFromUrl(urlCurRef.current);
          prefetchAt(ni + 1);
        })
        .catch((e) => setErr(e instanceof Error ? e.message : "TTS failed"))
        .finally(() => setBusy(false));
    },
    [fetchSpeechBlob, playAudioFromUrl, prefetchAt, stopPlayback]
  );

  const restartSection = useCallback(() => {
    const paras = parasRef.current;
    if (!paras.length) {
      void beginPlayback();
      return;
    }
    stopPlayback();
    indexRef.current = 0;
    setParaIndex(0);
    flushServerReadingRef.current();
    setPreview(previewOf(paras[0]));
    setPdfHighlightItemIndices(pdfParaItemIndicesRef.current[0] ?? []);
    setBusy(true);
    setErr(null);
    fetchSpeechBlob(paras[0])
      .then((blob) => {
        revoke(urlCurRef.current);
        urlCurRef.current = URL.createObjectURL(blob);
        playAudioFromUrl(urlCurRef.current);
        prefetchAt(1);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "TTS failed"))
      .finally(() => setBusy(false));
  }, [beginPlayback, fetchSpeechBlob, playAudioFromUrl, prefetchAt, stopPlayback]);

  return { loadSource, beginPlayback, togglePlay, goParagraph, restartSection };
};
