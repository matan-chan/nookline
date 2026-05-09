import { documentHasNonCollapsedTextSelection } from "../../../../utils/input/documentTextSelection";
import { ensureEpubReadingSurfaceStylesInjected } from "./epubReadingSurfaceStyles";
import { ensureEpubTtsHighlightStylesInjected } from "./epubViewerTtsHighlight";
import type { Contents, Rendition } from "epubjs";

const HIGHLIGHT_TEXT_MAX = 8000;

type Handlers = {
  onEpubContentPick?: (target: Node) => void;
  onEpubBookmarkContext?: (target: Node, clientX: number, clientY: number, highlight: { cfiRange: string; text: string } | null) => void;
  readerDarkDocument: boolean;
};

const buildClickHandler = (doc: Document, getOnPick: () => Handlers["onEpubContentPick"]) => (e: MouseEvent) => {
  if (e.button !== 0) return;
  const t = e.target as HTMLElement;
  if (t.closest("a")) return;
  const node = e.target as Node;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (documentHasNonCollapsedTextSelection(doc)) return;
      getOnPick()?.(node);
    });
  });
};

const captureSelectionHighlight = (contents: Contents, ignoreClass?: string) => {
  const sel = contents.document.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  try {
    const rng = sel.getRangeAt(0);
    const cfiRange = contents.cfiFromRange(rng, ignoreClass);
    const tx = sel.toString().replace(/\s+/g, " ").trim();
    if (cfiRange?.startsWith("epubcfi(") && tx) return { cfiRange, text: tx.slice(0, HIGHLIGHT_TEXT_MAX) };
  } catch {
    /* ignore */
  }
  return null;
};

const buildContextHandler = (contents: Contents, r: Rendition, getOnCtx: () => Handlers["onEpubBookmarkContext"]) => (e: MouseEvent) => {
  const onCtx = getOnCtx();
  if (!onCtx) return;
  const t = e.target as HTMLElement;
  if (t.closest("a")) return;
  e.preventDefault();
  const highlight = captureSelectionHighlight(contents, r.settings.ignoreClass);
  onCtx(e.target as Node, e.clientX, e.clientY, highlight);
};

type RegisterArgs = {
  rendition: Rendition;
  epubPickDocsRef: React.MutableRefObject<WeakSet<Document>>;
  epubReadingDocsRef: React.MutableRefObject<Set<Document>>;
  readerDarkDocumentRef: React.MutableRefObject<boolean>;
  onPickRef: React.MutableRefObject<Handlers["onEpubContentPick"]>;
  onCtxRef: React.MutableRefObject<Handlers["onEpubBookmarkContext"]>;
};

export const registerEpubContentHandlers = ({ rendition, epubPickDocsRef, epubReadingDocsRef, readerDarkDocumentRef, onPickRef, onCtxRef }: RegisterArgs) => {
  rendition.hooks.content.register((contents: Contents) => {
    const doc = contents.document;
    if (epubPickDocsRef.current.has(doc)) return;
    epubPickDocsRef.current.add(doc);
    epubReadingDocsRef.current.add(doc);
    ensureEpubReadingSurfaceStylesInjected(doc, readerDarkDocumentRef.current);
    ensureEpubTtsHighlightStylesInjected(doc);
    doc.addEventListener("click", buildClickHandler(doc, () => onPickRef.current), true);
    doc.addEventListener("contextmenu", buildContextHandler(contents, rendition, () => onCtxRef.current), true);
  });
};
