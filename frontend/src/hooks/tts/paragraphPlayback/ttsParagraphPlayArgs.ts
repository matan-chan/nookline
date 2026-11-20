import type { TtsChunkLimits } from "../../../utils/readerText/constants";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";
import type { MutableRefObject } from "react";

export type PdfMarginStripOptsRef = MutableRefObject<{ enabled: boolean; regexes: string[] }>;

export type PlayArgs = {
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
  playing: boolean;
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
