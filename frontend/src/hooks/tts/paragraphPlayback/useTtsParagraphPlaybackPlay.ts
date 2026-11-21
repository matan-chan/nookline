import { useTtsPlaySpeechAtIndex } from "./internal/useTtsPlaySpeechAtIndex";
import { useTtsParagraphLoader } from "./internal/useTtsParagraphLoader";
import type { PdfMarginStripOptsRef, PlayArgs } from "./ttsParagraphPlayArgs";
import { previewOf } from "../constants/ttsPlaybackConstants";
import { useCallback } from "react";

const EPUB_NOT_READY = "EPUB not ready";
const PDF_NOT_READY = "PDF not ready";
const NO_TEXT_MSG = "No extractable text on this page/section.";
const TTS_FAILED_MSG = "TTS failed";

export type { PdfMarginStripOptsRef };

export const useTtsParagraphPlaybackPlay = (args: PlayArgs) => {
  const {
    format,
    parasRef,
    anchorRef,
    epubHighlightElsRef,
    pdfParaItemIndicesRef,
    pdfSessionPageRef,
    pdfPageRef,
    indexRef,
    urlCurRef,
    flushServerReadingRef,
    audioRef,
    playingRef,
    voiceSpeedModelRef,
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
  } = args;

  const loadSource = useTtsParagraphLoader(args);
  const playSpeechAtIndex = useTtsPlaySpeechAtIndex(args);

  const beginPlayback = useCallback(async () => {
    setErr(null);
    const extracted = await loadSource();
    if (!extracted) {
      setErr(format === "epub" ? EPUB_NOT_READY : PDF_NOT_READY);
      return;
    }
    const { paragraphs: paras, anchor: anc } = extracted;
    if (paras.length === 0) {
      setErr(NO_TEXT_MSG);
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
      setErr(e instanceof Error ? e.message : TTS_FAILED_MSG);
    } finally {
      setBusy(false);
    }
  }, [format, loadSource, fetchSpeechBlob, playAudioFromUrl, prefetchAt, stopPlayback]);

  const resumePausedAudio = useCallback(
    (a: HTMLAudioElement, url: string) => {
      if (a.ended) a.currentTime = 0;
      const needsSrc = !a.src || a.readyState === HTMLMediaElement.HAVE_NOTHING;
      if (needsSrc) {
        a.src = url;
        a.load();
      }
      a.playbackRate = voiceSpeedModelRef.current.speed;
      void a.play().catch(() => playSpeechAtIndex(indexRef.current));
    },
    [playSpeechAtIndex, voiceSpeedModelRef],
  );

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    const hasSession = parasRef.current.length > 0;
    const url = urlCurRef.current;
    const isAudiblyPlaying = Boolean(a && !a.paused && !a.ended);

    if (isAudiblyPlaying) {
      a!.pause();
      playingRef.current = false;
      setPlaying(false);
      return;
    }

    if (hasSession && url) {
      if (a) {
        resumePausedAudio(a, url);
        return;
      }
      playAudioFromUrl(url);
      return;
    }

    if (hasSession) {
      playSpeechAtIndex(indexRef.current);
      return;
    }

    void beginPlayback();
  }, [beginPlayback, playAudioFromUrl, playSpeechAtIndex, resumePausedAudio, urlCurRef]);

  const goParagraph = useCallback(
    (delta: number) => {
      const paras = parasRef.current;
      if (!paras.length) return;
      const ni = Math.min(paras.length - 1, Math.max(0, indexRef.current + delta));
      playSpeechAtIndex(ni);
    },
    [playSpeechAtIndex],
  );

  const restartSection = useCallback(() => {
    if (!parasRef.current.length) {
      void beginPlayback();
      return;
    }
    playSpeechAtIndex(0);
  }, [beginPlayback, playSpeechAtIndex]);

  return { loadSource, beginPlayback, togglePlay, goParagraph, restartSection };
};
