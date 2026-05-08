import { useCallback, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";
import type { TtsChunkLimits } from "../../../utils/readerText/constants";
import type { PdfMarginStripOptsRef } from "../paragraphPlayback/useTtsParagraphPlaybackPlay";
import { runSeekFromEpubClick, runSeekFromPdfClick } from "../playback/ttsPlaybackSeekFromClick";

type SeekArgs = {
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
  setBusy: Dispatch<SetStateAction<boolean>>;
  renditionRef: MutableRefObject<Rendition | null>;
};

const seekPayload = (a: SeekArgs) => ({
  format: a.format,
  pdfMarginStripOptsRef: a.pdfMarginStripOptsRef,
  chunkLimitsRef: a.chunkLimitsRef,
  openAiPanel: a.openAiPanel,
  stopPlayback: a.stopPlayback,
  pdfDocRef: a.pdfDocRef,
  pdfNavigateRef: a.pdfNavigateRef,
  pdfPageRef: a.pdfPageRef,
  parasRef: a.parasRef,
  anchorRef: a.anchorRef,
  epubHighlightElsRef: a.epubHighlightElsRef,
  pdfParaItemIndicesRef: a.pdfParaItemIndicesRef,
  pdfSessionPageRef: a.pdfSessionPageRef,
  urlCurRef: a.urlCurRef,
  flushServerReadingRef: a.flushServerReadingRef,
  fetchSpeechBlob: a.fetchSpeechBlob,
  playAudioFromUrl: a.playAudioFromUrl,
  prefetchAt: a.prefetchAt,
  revoke: a.revoke,
  setErr: a.setErr,
  setPdfHighlightPage: a.setPdfHighlightPage,
  setTotalParas: a.setTotalParas,
  indexRef: a.indexRef,
  setParaIndex: a.setParaIndex,
  setPreview: a.setPreview,
  setPdfHighlightItemIndices: a.setPdfHighlightItemIndices,
  setPdfTextLayerTick: a.setPdfTextLayerTick,
  setBusy: a.setBusy,
});

export const useTtsParagraphPlaybackSeek = (a: SeekArgs) => {
  const pdfSeekCtx = useMemo(
    () => seekPayload(a),
    [a.format, a.openAiPanel, a.stopPlayback, a.fetchSpeechBlob, a.playAudioFromUrl, a.prefetchAt, a.pdfMarginStripOptsRef]
  );

  const seekFromPdfClick = useCallback(
    async (page: number, itemIndex: number) => runSeekFromPdfClick(pdfSeekCtx, page, itemIndex),
    [pdfSeekCtx]
  );

  const seekFromEpubClick = useCallback(
    async (target: Node) => runSeekFromEpubClick({ ...pdfSeekCtx, renditionRef: a.renditionRef }, target),
    [pdfSeekCtx, a.renditionRef]
  );

  return { seekFromPdfClick, seekFromEpubClick };
};
