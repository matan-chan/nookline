import { DEFAULT_TTS_CHUNK_LIMITS, type TtsChunkLimits } from "../../../utils/readerText/constants";
import { useRef, useState } from "react";

type Args = {
  userId: number;
  voice: string;
  speed: number;
  pitch: number;
  model: string;
  chunkLimits: TtsChunkLimits;
  pdfMarginStripEnabled: boolean;
  pdfMarginStripRegexes: string[];
  onPersistReadingProgress?: (position: string, percentage: number) => void;
};

export const useTtsParagraphPlaybackState = ({
  userId,
  voice,
  speed,
  pitch,
  model,
  chunkLimits,
  pdfMarginStripEnabled,
  pdfMarginStripRegexes,
  onPersistReadingProgress,
}: Args) => {
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paraIndex, setParaIndex] = useState(0);
  const [totalParas, setTotalParas] = useState(0);
  const [preview, setPreview] = useState("");
  const [pdfHighlightPage, setPdfHighlightPage] = useState<number | null>(null);
  const [pdfHighlightItemIndices, setPdfHighlightItemIndices] = useState<number[]>([]);
  const [pdfTextLayerTick, setPdfTextLayerTick] = useState(0);

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

  const persistReadingProgressRef = useRef(onPersistReadingProgress);
  persistReadingProgressRef.current = onPersistReadingProgress;

  const voiceSpeedModelRef = useRef({ userId, voice, speed, model, pitch });
  voiceSpeedModelRef.current = { userId, voice, speed, model, pitch };

  const chunkLimitsRef = useRef<TtsChunkLimits>(DEFAULT_TTS_CHUNK_LIMITS);
  chunkLimitsRef.current = chunkLimits;

  const pdfMarginStripOptsRef = useRef({ enabled: false, regexes: [] as string[] });
  pdfMarginStripOptsRef.current = { enabled: pdfMarginStripEnabled, regexes: pdfMarginStripRegexes };

  const advanceAfterParagraphRef = useRef<() => void>(() => {});

  return {
    playing,
    setPlaying,
    busy,
    setBusy,
    err,
    setErr,
    paraIndex,
    setParaIndex,
    totalParas,
    setTotalParas,
    preview,
    setPreview,
    pdfHighlightPage,
    setPdfHighlightPage,
    pdfHighlightItemIndices,
    setPdfHighlightItemIndices,
    pdfTextLayerTick,
    setPdfTextLayerTick,
    audioRef,
    urlCurRef,
    urlNextRef,
    prefetchAbortRef,
    parasRef,
    anchorRef,
    indexRef,
    playingRef,
    epubHighlightElsRef,
    pdfParaItemIndicesRef,
    pdfSessionPageRef,
    persistReadingProgressRef,
    voiceSpeedModelRef,
    chunkLimitsRef,
    pdfMarginStripOptsRef,
    advanceAfterParagraphRef,
  };
};
