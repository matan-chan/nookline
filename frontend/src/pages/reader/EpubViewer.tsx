import type { TtsChunkLimits } from "../../utils/readerText/constants";
import { extractEpubParagraphs } from "../../utils/readerText";
import { documentHasNonCollapsedTextSelection } from "../../utils/documentTextSelection";
import { getStoredToken } from "../../auth/authStorage";
import { ensureEpubReadingSurfaceStylesInjected } from "./epubReadingSurfaceStyles";
import { ensureEpubTtsHighlightStylesInjected } from "./epubViewerTtsHighlight";
import { darkReaderStyles, lightReaderStyles } from "./readerStyles";
import { isEpubCfi } from "./readerUtils";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { ReactReader } from "react-reader";
import type { Contents, Rendition } from "epubjs";
import { useState, useCallback, useEffect, useRef } from "react";

const SAVE_DEBOUNCE_MS = 700;

export const EpubViewer = ({
  bookId,
  resumeCfi,
  fallbackPercentage,
  onPersistProgress,
  onRenditionReady,
  onReaderLocationChanged,
  onEpubContentPick,
  onEpubBookmarkContext,
  ttsChunkLimits,
  scrollToParagraphIndex = null,
  bookmarkResumeSig = "",
}: {
  bookId: string;
  resumeCfi: string | null;
  fallbackPercentage: number;
  onPersistProgress: (position: string, percentage: number) => void;
  onRenditionReady?: (r: Rendition) => void;
  onReaderLocationChanged?: () => void;
  onEpubContentPick?: (target: Node) => void;
  onEpubBookmarkContext?: (
    target: Node,
    clientX: number,
    clientY: number,
    highlight: { cfiRange: string; text: string } | null,
  ) => void;
  ttsChunkLimits: TtsChunkLimits;
  scrollToParagraphIndex?: number | null;
  bookmarkResumeSig?: string;
}) => {
  const theme = useTheme();
  const [epubBuf, setEpubBuf] = useState<ArrayBuffer | null>(null);
  const [epubFetchErr, setEpubFetchErr] = useState<string | null>(null);
  const [location, setLocation] = useState<string | number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedResumeRef = useRef(false);
  const persistRef = useRef(onPersistProgress);
  const fallbackPctRef = useRef(fallbackPercentage);
  const onRenditionReadyRef = useRef(onRenditionReady);
  const onReaderLocationChangedRef = useRef(onReaderLocationChanged);
  const onEpubContentPickRef = useRef(onEpubContentPick);
  const onEpubBookmarkContextRef = useRef(onEpubBookmarkContext);
  const epubPickDocsRef = useRef<WeakSet<Document>>(new WeakSet());
  const renditionRef = useRef<Rendition | null>(null);
  const paragraphScrollDoneRef = useRef(false);
  onRenditionReadyRef.current = onRenditionReady;
  onReaderLocationChangedRef.current = onReaderLocationChanged;
  onEpubContentPickRef.current = onEpubContentPick;
  onEpubBookmarkContextRef.current = onEpubBookmarkContext;

  useEffect(() => {
    persistRef.current = onPersistProgress;
  }, [onPersistProgress]);

  useEffect(() => {
    fallbackPctRef.current = fallbackPercentage;
  }, [fallbackPercentage]);

  useEffect(() => {
    epubPickDocsRef.current = new WeakSet();
  }, [bookId]);

  useEffect(() => {
    if (!bookId.trim()) return;
    let cancelled = false;
    setEpubBuf(null);
    setEpubFetchErr(null);
    void (async () => {
      try {
        const tok = getStoredToken();
        const res = await fetch(`/api/files/books/${encodeURIComponent(bookId)}`, {
          headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (!cancelled) setEpubBuf(buf);
      } catch (e) {
        if (!cancelled) setEpubFetchErr(e instanceof Error ? e.message : "Failed to load EPUB");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    appliedResumeRef.current = false;
    paragraphScrollDoneRef.current = false;
  }, [bookId]);

  useEffect(() => {
    if (!bookmarkResumeSig) return;
    appliedResumeRef.current = false;
    paragraphScrollDoneRef.current = false;
  }, [bookmarkResumeSig]);

  useEffect(() => {
    if (!resumeCfi || !isEpubCfi(resumeCfi) || appliedResumeRef.current) return;
    setLocation(resumeCfi);
    appliedResumeRef.current = true;
  }, [resumeCfi]);

  useEffect(() => {
    if (scrollToParagraphIndex == null) return;
    const r = renditionRef.current;
    if (!r) return;
    let cancelled = false;
    const run = async () => {
      await new Promise((x) => setTimeout(x, 900));
      if (cancelled || paragraphScrollDoneRef.current) return;
      try {
        const ex = await extractEpubParagraphs(r, ttsChunkLimits);
        const el = ex.highlightEls[scrollToParagraphIndex]?.[0];
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        paragraphScrollDoneRef.current = true;
      } catch {
        /* ignore */
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [scrollToParagraphIndex, location, bookId, ttsChunkLimits]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const getRendition = useCallback((r: Rendition) => {
    renditionRef.current = r;
    onRenditionReadyRef.current?.(r);
    r.book.ready.then(() => r.book.locations.generate(1600)).catch(() => {});
    r.hooks.content.register((contents: Contents) => {
      const doc = contents.document;
      if (epubPickDocsRef.current.has(doc)) return;
      epubPickDocsRef.current.add(doc);
      ensureEpubReadingSurfaceStylesInjected(doc);
      ensureEpubTtsHighlightStylesInjected(doc);
      const fn = (e: MouseEvent) => {
        if (e.button !== 0) return;
        const t = e.target as HTMLElement;
        if (t.closest("a")) return;
        const node = e.target as Node;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (documentHasNonCollapsedTextSelection(doc)) return;
            onEpubContentPickRef.current?.(node);
          });
        });
      };
      const onCtx = (e: MouseEvent) => {
        if (!onEpubBookmarkContextRef.current) return;
        const t = e.target as HTMLElement;
        if (t.closest("a")) return;
        e.preventDefault();
        let highlight: { cfiRange: string; text: string } | null = null;
        const sel = contents.document.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          try {
            const rng = sel.getRangeAt(0);
            const cfiRange = contents.cfiFromRange(rng, r.settings.ignoreClass);
            const tx = sel.toString().replace(/\s+/g, " ").trim();
            if (cfiRange?.startsWith("epubcfi(") && tx) highlight = { cfiRange, text: tx.slice(0, 8000) };
          } catch {
            /* ignore */
          }
        }
        onEpubBookmarkContextRef.current(e.target as Node, e.clientX, e.clientY, highlight);
      };
      doc.addEventListener("click", fn, true);
      doc.addEventListener("contextmenu", onCtx, true);
    });
    r.on("locationChanged", (payload: { start: string; percentage?: number }) => {
      if (!payload?.start || !isEpubCfi(payload.start)) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        let pct = fallbackPctRef.current;
        if (typeof payload.percentage === "number" && !Number.isNaN(payload.percentage))
          pct = Math.round(Math.min(100, Math.max(0, payload.percentage * 100)));
        persistRef.current(payload.start, pct);
      }, SAVE_DEBOUNCE_MS);
    });
  }, []);

  const locationChanged = useCallback((cfi: string) => {
    setLocation(cfi);
    onReaderLocationChangedRef.current?.();
  }, []);

  return (
    <Box sx={{ position: "relative", height: "100%", minHeight: 0 }}>
      {epubFetchErr ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", p: 2 }}>
          <Typography color="error" variant="body2" textAlign="center">
            {epubFetchErr}
          </Typography>
        </Box>
      ) : !epubBuf ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <CircularProgress size={36} />
        </Box>
      ) : (
        <ReactReader
          url={epubBuf}
          location={location}
          locationChanged={locationChanged}
          getRendition={getRendition}
          epubOptions={{ flow: "paginated" }}
          readerStyles={theme.palette.mode === "light" ? lightReaderStyles : darkReaderStyles}
        />
      )}
    </Box>
  );
};
