export type TtsChunkLimits = {
  minChars: number;
  maxChars: number;
  periodScanExtra: number;
};

export const DEFAULT_TTS_CHUNK_LIMITS: TtsChunkLimits = {
  minChars: 200,
  maxChars: 300,
  periodScanExtra: 300,
};

export const SENTENCE_END_CHAR = ".";
export const PDF_LINE_Y_DELTA_PX = 4;
export const EPUB_BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre";
export const EPUB_FALLBACK_ANCHOR = "epub:visible";
