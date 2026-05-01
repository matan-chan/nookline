import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";
import type { PdfMarginStripOptsRef } from "./useTtsParagraphPlaybackPlay";
import { createAdvanceAfterParagraphHandler } from "./ttsPlaybackAdvanceAfterParagraph";
import { clearEpubDomHighlights } from "./ttsPlaybackEpubDom";
import { fetchTtsSpeechBlob } from "./ttsPlaybackFetchSpeech";
import { flushServerReadingPosition } from "./ttsPlaybackFlushReading";
import type { TtsChunkLimits } from "../../utils/readerText/constants";

type Args = {
  format: "epub" | "pdf";
  pdfMarginStripOptsRef: PdfMarginStripOptsRef;
  chunkLimitsRef: MutableRefObject<TtsChunkLimits>;
  renditionRef: MutableRefObject<Rendition | null>;
  pdfDocRef: MutableRefObject<PDFDocumentProxy | null>;
  pdfPageRef: MutableRefObject<number>;
  pdfNavigateRef?: MutableRefObject<((page: number) => void) | null>;
  voiceSpeedModelRef: MutableRefObject<{ userId: number; voice: string; speed: number; model: string; pitch: number }>;
  persistReadingProgressRef: MutableRefObject<((position: string, percentage: number) => void) | undefined>;
  parasRef: MutableRefObject<string[]>;
  indexRef: MutableRefObject<number>;
  anchorRef: MutableRefObject<string>;
  pdfParaItemIndicesRef: MutableRefObject<number[][]>;
  pdfSessionPageRef: MutableRefObject<number | null>;
  urlCurRef: MutableRefObject<string | null>;
  urlNextRef: MutableRefObject<string | null>;
  prefetchAbortRef: MutableRefObject<AbortController | null>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  playingRef: MutableRefObject<boolean>;
  advanceAfterParagraphRef: MutableRefObject<() => void>;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setErr: Dispatch<SetStateAction<string | null>>;
  setParaIndex: Dispatch<SetStateAction<number>>;
  setTotalParas: Dispatch<SetStateAction<number>>;
  setPreview: Dispatch<SetStateAction<string>>;
  setPdfHighlightPage: Dispatch<SetStateAction<number | null>>;
  setPdfHighlightItemIndices: Dispatch<SetStateAction<number[]>>;
  setPdfTextLayerTick: Dispatch<SetStateAction<number>>;
};

export const useTtsParagraphPlaybackAudio = ({
  format,
  pdfMarginStripOptsRef,
  chunkLimitsRef,
  renditionRef,
  pdfDocRef,
  pdfPageRef,
  pdfNavigateRef,
  voiceSpeedModelRef,
  persistReadingProgressRef,
  parasRef,
  indexRef,
  anchorRef,
  pdfParaItemIndicesRef,
  pdfSessionPageRef,
  urlCurRef,
  urlNextRef,
  prefetchAbortRef,
  audioRef,
  playingRef,
  advanceAfterParagraphRef,
  setPlaying,
  setBusy,
  setErr,
  setParaIndex,
  setTotalParas,
  setPreview,
  setPdfHighlightPage,
  setPdfHighlightItemIndices,
  setPdfTextLayerTick,
}: Args) => {
  const flushServerReadingRef = useRef<(opts?: { pdfPage?: number }) => void>(() => {});

  const revoke = (u: string | null) => {
    if (u) URL.revokeObjectURL(u);
  };

  const clearAudioOnly = useCallback(() => {
    prefetchAbortRef.current?.abort();
    prefetchAbortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    revoke(urlCurRef.current);
    revoke(urlNextRef.current);
    urlCurRef.current = null;
    urlNextRef.current = null;
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const stopPlayback = useCallback(() => {
    clearAudioOnly();
    clearEpubDomHighlights(renditionRef.current);
    setPdfHighlightItemIndices([]);
    setPdfHighlightPage(null);
  }, [clearAudioOnly, renditionRef]);

  const fetchSpeechBlob = useCallback(async (text: string, signal?: AbortSignal) => {
    const { userId: uid, voice: v, speed: sp, model: m, pitch: p } = voiceSpeedModelRef.current;
    return fetchTtsSpeechBlob(text, { userId: uid, voice: v, speed: sp, model: m, pitch: p }, signal);
  }, []);

  flushServerReadingRef.current = (opts?: { pdfPage?: number }) => {
    flushServerReadingPosition({
      persist: persistReadingProgressRef.current,
      format,
      pdfDoc: pdfDocRef.current,
      pdfPage: pdfPageRef.current,
      pdfSessionPage: pdfSessionPageRef.current,
      rendition: renditionRef.current,
      opts,
    });
  };

  const prefetchAt = useCallback(
    (i: number) => {
      prefetchAbortRef.current?.abort();
      const paras = parasRef.current;
      if (i >= paras.length) return;
      const ac = new AbortController();
      prefetchAbortRef.current = ac;
      fetchSpeechBlob(paras[i], ac.signal)
        .then((blob) => {
          if (ac.signal.aborted) return;
          revoke(urlNextRef.current);
          urlNextRef.current = URL.createObjectURL(blob);
        })
        .catch(() => {});
    },
    [fetchSpeechBlob]
  );

  const playAudioFromUrl = useCallback((url: string) => {
    audioRef.current?.pause();
    const a = new Audio(url);
    a.playbackRate = voiceSpeedModelRef.current.speed;
    a.onended = () => {
      playingRef.current = false;
      setPlaying(false);
      advanceAfterParagraphRef.current();
    };
    a.onerror = () => {
      setErr("Audio playback failed");
      playingRef.current = false;
      setPlaying(false);
    };
    audioRef.current = a;
    void a.play();
    playingRef.current = true;
    setPlaying(true);
  }, []);

  advanceAfterParagraphRef.current = createAdvanceAfterParagraphHandler({
    format,
    pdfMarginStripOptsRef,
    chunkLimitsRef,
    parasRef,
    indexRef,
    anchorRef,
    pdfDocRef,
    pdfNavigateRef,
    pdfPageRef,
    pdfParaItemIndicesRef,
    pdfSessionPageRef,
    urlCurRef,
    urlNextRef,
    flushServerReadingRef,
    fetchSpeechBlob,
    playAudioFromUrl,
    prefetchAt,
    clearAudioOnly,
    revoke,
    setBusy,
    setErr,
    setParaIndex,
    setTotalParas,
    setPreview,
    setPdfHighlightPage,
    setPdfHighlightItemIndices,
    setPdfTextLayerTick,
  });

  return {
    flushServerReadingRef,
    revoke,
    clearAudioOnly,
    stopPlayback,
    fetchSpeechBlob,
    prefetchAt,
    playAudioFromUrl,
  };
};
