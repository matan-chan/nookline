import { useTtsParagraphPlaybackAudio } from "./tts/useTtsParagraphPlaybackAudio";
import { useTtsParagraphPlaybackEffects } from "./tts/useTtsParagraphPlaybackEffects";
import { useTtsParagraphPlaybackPlay } from "./tts/useTtsParagraphPlaybackPlay";
import { useTtsParagraphPlaybackScroll } from "./tts/useTtsParagraphPlaybackScroll";
import { useTtsParagraphPlaybackSeek } from "./tts/useTtsParagraphPlaybackSeek";
import { DEFAULT_TTS_CHUNK_LIMITS, type TtsChunkLimits } from "../utils/readerText/constants";
import { useEffect, useRef, useState } from "react";
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

export const useTtsParagraphPlayback = ({
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
}: UseTtsParagraphPlaybackArgs) => {
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paraIndex, setParaIndex] = useState(0);
  const [totalParas, setTotalParas] = useState(0);
  const [preview, setPreview] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlCurRef = useRef<string | null>(null);
  const urlNextRef = useRef<string | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const parasRef = useRef<string[]>([]);
  const anchorRef = useRef("");
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const epubHighlightElsRef = useRef<(HTMLElement | null)[][]>([]);
  const pdfParaItemIndicesRef = useRef<number[][]>([]);
  const pdfSessionPageRef = useRef<number | null>(null);
  const [pdfHighlightPage, setPdfHighlightPage] = useState<number | null>(null);
  const [pdfHighlightItemIndices, setPdfHighlightItemIndices] = useState<number[]>([]);
  const [pdfTextLayerTick, setPdfTextLayerTick] = useState(0);

  const persistReadingProgressRef = useRef(onPersistReadingProgress);
  persistReadingProgressRef.current = onPersistReadingProgress;

  const voiceSpeedModelRef = useRef({ userId, voice, speed, model, pitch });
  voiceSpeedModelRef.current = { userId, voice, speed, model, pitch };

  const chunkLimitsRef = useRef<TtsChunkLimits>(DEFAULT_TTS_CHUNK_LIMITS);
  chunkLimitsRef.current = chunkLimits;

  const pdfMarginStripOptsRef = useRef({ enabled: false, regexes: [] as string[] });
  pdfMarginStripOptsRef.current = { enabled: pdfMarginStripEnabled, regexes: pdfMarginStripRegexes };

  const advanceAfterParagraphRef = useRef<() => void>(() => {});

  const { flushServerReadingRef, revoke, stopPlayback, fetchSpeechBlob, prefetchAt, playAudioFromUrl } =
    useTtsParagraphPlaybackAudio({
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
    });

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = speed;
    const nextIdx = indexRef.current + 1;
    if (nextIdx < parasRef.current.length) prefetchAt(nextIdx);
  }, [speed, prefetchAt]);

  const { beginPlayback, togglePlay, goParagraph, restartSection } = useTtsParagraphPlaybackPlay({
    format,
    chunkLimitsRef,
    pdfMarginStripOptsRef,
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
  });

  const { seekFromPdfClick, seekFromEpubClick } = useTtsParagraphPlaybackSeek({
    format,
    pdfMarginStripOptsRef,
    chunkLimitsRef,
    openAiPanel,
    stopPlayback,
    pdfDocRef,
    pdfNavigateRef,
    pdfPageRef,
    parasRef,
    anchorRef,
    epubHighlightElsRef,
    pdfParaItemIndicesRef,
    pdfSessionPageRef,
    urlCurRef,
    flushServerReadingRef,
    fetchSpeechBlob,
    playAudioFromUrl,
    prefetchAt,
    revoke,
    setErr,
    setPdfHighlightPage,
    setTotalParas,
    indexRef,
    setParaIndex,
    setPreview,
    setPdfHighlightItemIndices,
    setPdfTextLayerTick,
    setBusy,
    renditionRef,
  });

  const scrollToCurrentReading = useTtsParagraphPlaybackScroll({
    format,
    paraIndex,
    totalParas,
    pdfScrollToReadingRef,
    epubHighlightElsRef,
  });

  useTtsParagraphPlaybackEffects({
    bookId,
    format,
    panelOpen,
    playing,
    navRevision,
    paraIndex,
    totalParas,
    stopPlayback,
    renditionRef,
    parasRef,
    anchorRef,
    epubHighlightElsRef,
    pdfParaItemIndicesRef,
    pdfSessionPageRef,
    epubNavSuppressRef,
    setTotalParas,
    setParaIndex,
    setPreview,
    setErr,
    setPdfHighlightPage,
    setPdfHighlightItemIndices,
    setPdfTextLayerTick,
  });

  return {
    playing,
    busy,
    err,
    setErr,
    paraIndex,
    totalParas,
    preview,
    togglePlay,
    goParagraph,
    restartSection,
    beginPlayback,
    pdfHighlightPage,
    pdfHighlightItemIndices,
    pdfTextLayerTick,
    seekFromPdfClick,
    seekFromEpubClick,
    scrollToCurrentReading,
  };
};
