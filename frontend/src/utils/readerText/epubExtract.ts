import type { Rendition } from "epubjs";
import { DEFAULT_TTS_CHUNK_LIMITS, EPUB_BLOCK_SELECTOR, EPUB_FALLBACK_ANCHOR, type TtsChunkLimits } from "./constants";
import { buildJoinedSpans, normalizeWs, plainTextToTtsChunks, splitIntoTtsChunkRanges } from "./ttsChunking";

const getRenditionContentsList = (rendition: Rendition) => {
  const raw = rendition.getContents() as { document: Document } | { document: Document }[];
  return Array.isArray(raw) ? raw : [raw];
};

const collectEpubSegments = (rendition: Rendition): { text: string; el: HTMLElement }[] => {
  const segments: { text: string; el: HTMLElement }[] = [];
  for (const c of getRenditionContentsList(rendition)) {
    const body = c.document?.body;
    if (!body) continue;
    const blocks = body.querySelectorAll(EPUB_BLOCK_SELECTOR);
    blocks.forEach((node) => {
      const t = normalizeWs((node as HTMLElement).innerText ?? "");
      if (!t) return;
      segments.push({ text: t, el: node as HTMLElement });
    });
  }
  return segments;
};

const epubSegmentsToChunks = (segments: { text: string; el: HTMLElement | null }[], lim: TtsChunkLimits): { paragraphs: string[]; highlightEls: (HTMLElement | null)[][] } => {
  if (!segments.length) return { paragraphs: [], highlightEls: [] };
  const { full, spans } = buildJoinedSpans(segments.map((s) => ({ text: s.text, meta: s.el as HTMLElement | null })));
  if (!full) return { paragraphs: [], highlightEls: [] };
  const ranges = splitIntoTtsChunkRanges(full, lim);
  const paragraphs: string[] = [];
  const highlightEls: (HTMLElement | null)[][] = [];
  for (const r of ranges) {
    const slice = full.slice(r.start, r.end).trim();
    if (!slice) continue;
    paragraphs.push(slice);
    const els: (HTMLElement | null)[] = [];
    for (const sp of spans) {
      if (sp.end <= r.start || sp.start >= r.end) continue;
      const el = sp.meta;
      if (el && !els.includes(el)) els.push(el);
    }
    highlightEls.push(els);
  }
  return { paragraphs, highlightEls };
};

const buildEmptyHighlights = (count: number): (HTMLElement | null)[][] => Array.from({ length: count }, () => []);

const joinVisibleBodyTexts = (rendition: Rendition): string => {
  const parts: string[] = [];
  for (const c of getRenditionContentsList(rendition)) {
    const doc = c.document;
    if (doc?.body) parts.push(doc.body.innerText || "");
  }
  return parts.join("\n\n");
};

const buildEpubFallbackFromVisible = (rendition: Rendition, startCfi: string, lim: TtsChunkLimits): { paragraphs: string[]; anchor: string; highlightEls: (HTMLElement | null)[][] } => {
  const paragraphs = plainTextToTtsChunks(joinVisibleBodyTexts(rendition), lim);
  return {
    paragraphs,
    anchor: startCfi || EPUB_FALLBACK_ANCHOR,
    highlightEls: buildEmptyHighlights(paragraphs.length),
  };
};

const xmlToPlainText = (xml: string): string => {
  const xhtml = new DOMParser().parseFromString(xml, "application/xhtml+xml");
  if (xhtml.querySelector("parsererror")) {
    const html = new DOMParser().parseFromString(xml, "text/html");
    return (html.body?.innerText || html.documentElement?.textContent || "").trim();
  }
  const body = xhtml.querySelector("body") || xhtml.documentElement;
  return (body?.textContent || "").trim();
};

export const epubResolveStartCfi = async (rendition: Rendition): Promise<string> => {
  const rawLoc = rendition.currentLocation();
  const located = (await Promise.resolve(rawLoc)) as { start?: { cfi?: string } } | null;
  return located?.start?.cfi ?? "";
};

const loadSectionPlainChunks = async (book: Rendition["book"], startCfi: string, lim: TtsChunkLimits): Promise<{ paragraphs: string[]; anchor: string; highlightEls: (HTMLElement | null)[][] } | null> => {
  const section = book.spine.get(startCfi);
  if (!section) return null;
  try {
    await section.load(book.load.bind(book));
    const root = section.contents;
    if (!root) return null;
    const xml = new XMLSerializer().serializeToString(root);
    const text = xmlToPlainText(xml);
    const paragraphs = plainTextToTtsChunks(text, lim);
    return {
      paragraphs,
      anchor: startCfi,
      highlightEls: buildEmptyHighlights(paragraphs.length),
    };
  } catch {
    return null;
  }
};

export const extractEpubParagraphs = async (rendition: Rendition, lim: TtsChunkLimits = DEFAULT_TTS_CHUNK_LIMITS): Promise<{ paragraphs: string[]; anchor: string; highlightEls: (HTMLElement | null)[][] }> => {
  const book = rendition.book;
  const startCfi = await epubResolveStartCfi(rendition);

  const segments = collectEpubSegments(rendition);
  if (segments.length > 0) {
    const { paragraphs, highlightEls } = epubSegmentsToChunks(segments, lim);
    if (paragraphs.length > 0)
      return {
        paragraphs,
        anchor: startCfi || EPUB_FALLBACK_ANCHOR,
        highlightEls,
      };
  }

  if (!startCfi) return buildEpubFallbackFromVisible(rendition, startCfi, lim);

  const fromSection = await loadSectionPlainChunks(book, startCfi, lim);
  if (fromSection) return fromSection;

  return buildEpubFallbackFromVisible(rendition, startCfi, lim);
};
