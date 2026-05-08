import { previewOf } from "../../constants/ttsPlaybackConstants";
import type { PlayArgs } from "../ttsParagraphPlayArgs";
import { useCallback } from "react";

const TTS_FAILED_MSG = "TTS failed";

type Args = Pick<
  PlayArgs,
  | "parasRef"
  | "indexRef"
  | "urlCurRef"
  | "flushServerReadingRef"
  | "pdfParaItemIndicesRef"
  | "fetchSpeechBlob"
  | "playAudioFromUrl"
  | "prefetchAt"
  | "stopPlayback"
  | "revoke"
  | "setErr"
  | "setParaIndex"
  | "setPreview"
  | "setPdfHighlightItemIndices"
  | "setBusy"
>;

export const useTtsPlaySpeechAtIndex = ({
  parasRef,
  indexRef,
  urlCurRef,
  flushServerReadingRef,
  pdfParaItemIndicesRef,
  fetchSpeechBlob,
  playAudioFromUrl,
  prefetchAt,
  stopPlayback,
  revoke,
  setErr,
  setParaIndex,
  setPreview,
  setPdfHighlightItemIndices,
  setBusy,
}: Args) =>
  useCallback(
    (nextIndex: number) => {
      const paras = parasRef.current;
      if (!paras.length) return;
      stopPlayback();
      indexRef.current = nextIndex;
      setParaIndex(nextIndex);
      flushServerReadingRef.current();
      setPreview(previewOf(paras[nextIndex]));
      setPdfHighlightItemIndices(pdfParaItemIndicesRef.current[nextIndex] ?? []);
      setBusy(true);
      setErr(null);
      fetchSpeechBlob(paras[nextIndex])
        .then((blob) => {
          revoke(urlCurRef.current);
          urlCurRef.current = URL.createObjectURL(blob);
          playAudioFromUrl(urlCurRef.current);
          prefetchAt(nextIndex + 1);
        })
        .catch((e) => setErr(e instanceof Error ? e.message : TTS_FAILED_MSG))
        .finally(() => setBusy(false));
    },
    [fetchSpeechBlob, playAudioFromUrl, prefetchAt, stopPlayback],
  );
