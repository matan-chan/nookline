import type { TtsChunkLimits } from "../../../../utils/readerText/constants";
import { extractEpubParagraphs } from "../../../../utils/readerText";
import { ensureEpubReadingSurfaceStylesInjected } from "./epubReadingSurfaceStyles";
import { darkReaderStyles, lightReaderStyles } from "../../readerStyles";
import { isEpubCfi } from "../../readerUtils";
import { registerEpubContentHandlers } from "./epubViewerContentHandlers";
import { useEpubFileLoader } from "./useEpubFileLoader";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { ReactReader } from "react-reader";
import type { Rendition } from "epubjs";
import { useState, useCallback, useEffect, useRef } from "react";

const SAVE_DEBOUNCE_MS = 700;
const PARAGRAPH_SCROLL_DELAY_MS = 900;
const LOCATIONS_GRANULARITY = 1600;

type EpubViewerProps = {
  bookId: string;
  resumeCfi: string | null;
  fallbackPercentage: number;
  onPersistProgress: (position: string, percentage: number) => void;
  onRenditionReady?: (r: Rendition) => void;
  onReaderLocationChanged?: () => void;
  onEpubContentPick?: (target: Node) => void;
  onEpubBookmarkContext?: (target: Node, clientX: number, clientY: number, highlight: { cfiRange: string; text: string } | null) => void;
  ttsChunkLimits: TtsChunkLimits;
  scrollToParagraphIndex?: number | null;
  bookmarkResumeSig?: string;
  readerDarkDocument?: boolean;
};

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
  readerDarkDocument = false,
}: EpubViewerProps) => {
  const theme = useTheme();
  const { epubBuf, epubFetchErr } = useEpubFileLoader(bookId);
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
  const epubReadingDocsRef = useRef(new Set<Document>());
  const readerDarkDocumentRef = useRef(readerDarkDocument);
  readerDarkDocumentRef.current = readerDarkDocument;
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
    epubReadingDocsRef.current.clear();
  }, [bookId]);

  useEffect(() => {
    epubReadingDocsRef.current.forEach((d) => ensureEpubReadingSurfaceStylesInjected(d, readerDarkDocument));
  }, [readerDarkDocument]);

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
      await new Promise((x) => setTimeout(x, PARAGRAPH_SCROLL_DELAY_MS));
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

  const persistLocationChange = useCallback((payload: { start: string; percentage?: number }) => {
    if (!payload?.start || !isEpubCfi(payload.start)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      let pct = fallbackPctRef.current;
      if (typeof payload.percentage === "number" && !Number.isNaN(payload.percentage))
        pct = Math.round(Math.min(100, Math.max(0, payload.percentage * 100)));
      persistRef.current(payload.start, pct);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const getRendition = useCallback((r: Rendition) => {
    renditionRef.current = r;
    onRenditionReadyRef.current?.(r);
    r.book.ready.then(() => r.book.locations.generate(LOCATIONS_GRANULARITY)).catch(() => {});
    registerEpubContentHandlers({
      rendition: r,
      epubPickDocsRef,
      epubReadingDocsRef,
      readerDarkDocumentRef,
      onPickRef: onEpubContentPickRef,
      onCtxRef: onEpubBookmarkContextRef,
    });
    r.on("locationChanged", persistLocationChange);
  }, [persistLocationChange]);

  const locationChanged = useCallback((cfi: string) => {
    setLocation(cfi);
    onReaderLocationChangedRef.current?.();
  }, []);

  const readerChromeStyles = readerDarkDocument ? darkReaderStyles : theme.palette.mode === "dark" ? darkReaderStyles : lightReaderStyles;

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
        <ReactReader url={epubBuf} location={location} locationChanged={locationChanged} getRendition={getRendition} epubOptions={{ flow: "paginated" }} readerStyles={readerChromeStyles} />
      )}
    </Box>
  );
};
