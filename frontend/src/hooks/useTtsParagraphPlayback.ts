import { useTtsParagraphPlaybackAudio } from "./tts/hooks/useTtsParagraphPlaybackAudio";
import { useTtsParagraphPlaybackEffects } from "./tts/hooks/useTtsParagraphPlaybackEffects";
import { useTtsParagraphPlaybackPlay } from "./tts/paragraphPlayback/useTtsParagraphPlaybackPlay";
import { useTtsParagraphPlaybackScroll } from "./tts/hooks/useTtsParagraphPlaybackScroll";
import { useTtsParagraphPlaybackSeek } from "./tts/hooks/useTtsParagraphPlaybackSeek";
import { useTtsParagraphPlaybackState } from "./tts/hooks/useTtsParagraphPlaybackState";
import type { TtsChunkLimits } from "../utils/readerText/constants";
import { useEffect } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";

export type UseTtsParagraphPlaybackArgs = {
  userId: number;
  bookId: string;
  format: "epub" | "pdf";
  renditionRef: React.MutableRefObject<Rendition | null>;
  pdfDocRef: React.MutableRefObject<PDFDocumentProxy | null>;
  pdfPageRef: React.MutableRefObject<number>;
  pdfNavigateRef?: React.MutableRefObject<((page: number) => void) | null>;
  pdfScrollToReadingRef?: React.MutableRefObject<(() => void) | null>;
  voice: string;
  speed: number;
  pitch: number;
  model: string;
  panelOpen: boolean;
  navRevision: number;
  openAiPanel?: () => void;
  epubNavSuppressRef?: React.MutableRefObject<boolean>;
  onPersistReadingProgress?: (position: string, percentage: number) => void;
  chunkLimits: TtsChunkLimits;
  pdfMarginStripEnabled: boolean;
  pdfMarginStripRegexes: string[];
};

export const useTtsParagraphPlayback = (args: UseTtsParagraphPlaybackArgs) => {
  const {
    userId,
    bookId,
    format,
    renditionRef,
    pdfDocRef,
    pdfPageRef,
    pdfNavigateRef,
    pdfScrollToReadingRef,
    voice,
    speed,
    pitch,
    model,
    panelOpen,
    navRevision,
    openAiPanel,
    epubNavSuppressRef,
    onPersistReadingProgress,
    chunkLimits,
    pdfMarginStripEnabled,
    pdfMarginStripRegexes,
  } = args;

  const s = useTtsParagraphPlaybackState({
    userId,
    voice,
    speed,
    pitch,
    model,
    chunkLimits,
    pdfMarginStripEnabled,
    pdfMarginStripRegexes,
    onPersistReadingProgress,
  });

  const { flushServerReadingRef, revoke, stopPlayback, fetchSpeechBlob, prefetchAt, playAudioFromUrl } = useTtsParagraphPlaybackAudio({
    ...s,
    format,
    renditionRef,
    pdfDocRef,
    pdfPageRef,
    pdfNavigateRef,
  });

  useEffect(() => {
    const a = s.audioRef.current;
    if (a) a.playbackRate = speed;
    const nextIdx = s.indexRef.current + 1;
    if (nextIdx < s.parasRef.current.length) prefetchAt(nextIdx);
  }, [speed, prefetchAt, s.audioRef, s.indexRef, s.parasRef]);

  const { beginPlayback, togglePlay, goParagraph, restartSection } = useTtsParagraphPlaybackPlay({
    ...s,
    format,
    renditionRef,
    pdfDocRef,
    pdfPageRef,
    flushServerReadingRef,
    fetchSpeechBlob,
    playAudioFromUrl,
    prefetchAt,
    stopPlayback,
    revoke,
  });

  const { seekFromPdfClick, seekFromEpubClick } = useTtsParagraphPlaybackSeek({
    ...s,
    format,
    openAiPanel,
    stopPlayback,
    pdfDocRef,
    pdfNavigateRef,
    pdfPageRef,
    flushServerReadingRef,
    fetchSpeechBlob,
    playAudioFromUrl,
    prefetchAt,
    revoke,
    renditionRef,
  });

  const scrollToCurrentReading = useTtsParagraphPlaybackScroll({
    ...s,
    format,
    pdfScrollToReadingRef,
  });

  useTtsParagraphPlaybackEffects({
    ...s,
    bookId,
    format,
    panelOpen,
    navRevision,
    stopPlayback,
    renditionRef,
    epubNavSuppressRef,
  });

  return {
    playing: s.playing,
    busy: s.busy,
    err: s.err,
    setErr: s.setErr,
    paraIndex: s.paraIndex,
    totalParas: s.totalParas,
    preview: s.preview,
    togglePlay,
    goParagraph,
    restartSection,
    beginPlayback,
    pdfHighlightPage: s.pdfHighlightPage,
    pdfHighlightItemIndices: s.pdfHighlightItemIndices,
    pdfTextLayerTick: s.pdfTextLayerTick,
    seekFromPdfClick,
    seekFromEpubClick,
    scrollToCurrentReading,
  };
};
