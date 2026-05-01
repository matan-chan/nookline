export const READ_HIGHLIGHT_PRESET_COLORS = [
  "#f9a8d4",
  "#fca5a5",
  "#fdba74",
  "#fde047",
  "#86efac",
  "#67e8f9",
  "#93c5fd",
  "#c4b5fd",
  "#d8b4fe",
  "#94a3b8",
] as const;

export const PDF_READER_HIGHLIGHT_MARK_CLASS = "nookline-reader-hl-pdf";

const parseHexRgb = (hex: string): [number, number, number] | null => {
  const raw = hex.replace(/^#/, "").trim();
  if (raw.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const n = parseInt(raw, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const pdfHighlightBackgroundRgba = (hex: string, alpha = 0.48) => {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return `rgba(${r},${g},${b},${alpha})`;
};

export const pdfHighlightEdgeRgb = (hex: string) => {
  const rgb = parseHexRgb(hex);
  if (!rgb) return "rgb(22, 163, 74)";
  const [r, g, b] = rgb;
  const d = (x: number) => Math.round(x * 0.52);
  return `rgb(${d(r)},${d(g)},${d(b)})`;
};

/** Same pattern as TTS PDF mark: fill + 1px ring; used as HTML `style` attribute on `<mark>`. */
export const pdfSavedHighlightMarkStyleAttr = (hex: string) => {
  const bg = pdfHighlightBackgroundRgba(hex, 0.42);
  const edge = pdfHighlightEdgeRgb(hex);
  return `style="background-color:${bg};box-shadow:0 0 0 1px ${edge}"`;
};

export const epubHighlightSvgBaseStyles = (mode: "light" | "dark") =>
  mode === "dark"
    ? ({ "fill-opacity": "0.5", "mix-blend-mode": "normal" } as const)
    : ({ "fill-opacity": "0.38", "mix-blend-mode": "multiply" } as const);
