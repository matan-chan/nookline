import { useAuth } from "../../auth/AuthContext";
import { getStoredToken } from "../../auth/authStorage";
import { DEFAULT_TTS_CHUNK_LIMITS } from "../../utils/readerText/constants";
import { epubParagraphIndexForDomTarget, epubResolveStartCfi, extractEpubParagraphs } from "../../utils/readerText";
import { encodeEpubBookmarkPosition, encodePdfBookmarkPosition } from "../../utils/readerBookmarkPosition";
import { encodeEpubHighlightPositions, encodePdfHighlightPositions, type PdfHighlightStored } from "../../utils/readerHighlightPosition";
import { parsePdfMarginStripRegexesFromBookMetadata } from "../../utils/parsePdfMarginStripRegexesFromBookMetadata";
import { useTtsParagraphPlayback } from "../../hooks/useTtsParagraphPlayback";
import { DEFAULT_TTS_VOICE_ID } from "../../hooks/tts/ttsPlaybackConstants";
import PdfBookViewer from "../../components/PdfBookViewer";
import { getFileExt } from "../../utils/cover";
import { UPDATE_TTS_SETTINGS } from "../settings/settingsQueries";
import { ADD_BOOKMARK, ADD_HIGHLIGHT, READER_BOOK_QUERY, READER_HIGHLIGHTS, READER_TTS_SETTINGS, UPDATE_PROGRESS } from "./readerQueries";
import { ReaderLoadingView } from "./ReaderLoadingView";
import { EpubReaderView } from "./EpubReaderView";
import { TtsReaderPanel } from "./TtsReaderPanel";
import { ReaderBookmarkContextMenu } from "./ReaderBookmarkContextMenu";
import { ReaderBookmarkNameModal } from "./ReaderBookmarkNameModal";
import type { BookmarkMenuState, EpubHighlightMenu } from "./readerPageTypes";
import { computePdfBookmarkDomIndex, computePdfStoredPage, computeReaderResumeCfi } from "./readerResumePositions";
import { useReaderEpubHighlightAnnotations } from "./useReaderEpubHighlightAnnotations";
import { useReaderNavParams } from "./useReaderNavParams";
import { useMutation, useQuery } from "@apollo/client";
import { Box, useTheme } from "@mui/material";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ReaderPage = () => {
  const theme = useTheme();
  const { t } = useTranslation("reader");
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const { bookId } = useParams<{ bookId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bmRaw, hlRaw, decodedBm, decodedHl } = useReaderNavParams(bookId, searchParams, setSearchParams);
  const numericBookId = useMemo(() => {
    if (!bookId) return undefined;
    const n = parseInt(bookId, 10);
    return Number.isFinite(n) ? n : undefined;
  }, [bookId]);
  const [aiOpen, setAiOpen] = useState(searchParams.get("ai") === "1");
  const [navRevision, setNavRevision] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState(DEFAULT_TTS_VOICE_ID);
  const [voiceOptions, setVoiceOptions] = useState<string[]>([]);
  const [pdfPanelPage, setPdfPanelPage] = useState(1);
  const [pdfPanelNumPages, setPdfPanelNumPages] = useState(0);
  const renditionRef = useRef<Rendition | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const pdfPageRef = useRef(1);
  const pdfNavigateRef = useRef<((page: number) => void) | null>(null);
  const pdfScrollToReadingRef = useRef<(() => void) | null>(null);
  const epubTtsNavSuppressRef = useRef(false);
  const ttsReaderHydratedForPanelOpenRef = useRef(false);
  const [bookmarkMenu, setBookmarkMenu] = useState<BookmarkMenuState | null>(null);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [bookmarkNameDraft, setBookmarkNameDraft] = useState("");
  const bookmarkPendingRef = useRef<BookmarkMenuState | null>(null);
  const [renditionReadyTick, setRenditionReadyTick] = useState(0);

  const [addBookmarkMut] = useMutation(ADD_BOOKMARK);

  const { data: highlightsData } = useQuery<{
    highlights: { id: number; startPos: string; endPos: string; text: string; color: string }[];
  }>(READER_HIGHLIGHTS, {
    variables: { bookId: numericBookId ?? 0 },
    skip: !bookId,
  });
  const bookHighlights = highlightsData?.highlights ?? [];
  const highlightsSig = useMemo(() => bookHighlights.map((h) => `${h.id}:${h.startPos}:${h.color}`).join("|"), [bookHighlights]);

  const [addHighlightMut] = useMutation(ADD_HIGHLIGHT, {
    refetchQueries: bookId ? [{ query: READER_HIGHLIGHTS, variables: { bookId: numericBookId ?? 0 } }] : [],
  });

  const bumpNav = useCallback(() => setNavRevision((n) => n + 1), []);

  const onPdfDocumentLoad = useCallback((doc: PDFDocumentProxy) => {
    pdfDocRef.current = doc;
    setPdfPanelNumPages(doc.numPages);
  }, []);

  const onReadingPageChange = useCallback(
    (page: number, source?: "scroll" | "tts" | "button") => {
      pdfPageRef.current = page;
      setPdfPanelPage(page);
      if (source === "button") bumpNav();
    },
    [bumpNav]
  );

  const onRenditionReady = useCallback((r: Rendition) => {
    renditionRef.current = r;
    setRenditionReadyTick((n) => n + 1);
  }, []);

  const onEpubReaderLocationChanged = useCallback(() => {
    if (epubTtsNavSuppressRef.current) return;
    if (aiOpen) return;
    bumpNav();
  }, [bumpNav, aiOpen]);

  useEffect(() => {
    setNavRevision(0);
    renditionRef.current = null;
    pdfDocRef.current = null;
    pdfPageRef.current = 1;
    setPdfPanelPage(1);
    setPdfPanelNumPages(0);
  }, [bookId]);

  const { data, loading: bookLoading } = useQuery<{
    book: {
      id: number;
      title: string;
      metadata: string | null;
      fileExt: string | null;
      readingProgressForUser: { position: string; percentage: number } | null;
    } | null;
  }>(READER_BOOK_QUERY, {
    variables: { id: numericBookId ?? 0, userId },
    skip: !bookId || user == null,
    fetchPolicy: "cache-and-network",
  });

  const book = data?.book;
  const fileExt = book ? book.fileExt ?? getFileExt(book) : null;

  const { data: ttsData, refetch: refetchTts } = useQuery<{
    ttsSettings: {
      mode: string;
      voice: string;
      model: string;
      speed: number;
      pitch: number;
      chunkMinChars: number;
      chunkMaxChars: number;
      chunkPeriodExtra: number;
      readerShowPage: boolean;
      readerShowTitle: boolean;
      readerStripPdfMargins: boolean;
      readerDarkDocument: boolean;
    };
  }>(READER_TTS_SETTINGS, { variables: { userId }, skip: !bookId || user == null });

  const readerTtsChunkLimits = useMemo(() => {
    const s = ttsData?.ttsSettings;
    if (!s) return DEFAULT_TTS_CHUNK_LIMITS;
    return {
      minChars: typeof s.chunkMinChars === "number" ? s.chunkMinChars : DEFAULT_TTS_CHUNK_LIMITS.minChars,
      maxChars: typeof s.chunkMaxChars === "number" ? s.chunkMaxChars : DEFAULT_TTS_CHUNK_LIMITS.maxChars,
      periodScanExtra: typeof s.chunkPeriodExtra === "number" ? s.chunkPeriodExtra : DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra,
    };
  }, [ttsData?.ttsSettings]);

  const pdfMarginStripRegexes = useMemo(() => parsePdfMarginStripRegexesFromBookMetadata(book?.metadata ?? null), [book?.metadata]);
  const pdfMarginStripEnabled = ttsData?.ttsSettings?.readerStripPdfMargins !== false && pdfMarginStripRegexes.length > 0;
  const readerDarkDocument = ttsData?.ttsSettings?.readerDarkDocument === true;

  const [updateTtsSettings] = useMutation(UPDATE_TTS_SETTINGS, {
    refetchQueries: [{ query: READER_TTS_SETTINGS, variables: { userId } }],
  });

  const commitPlayback = useCallback(
    (patch: { voice?: string; speed?: number }) => {
      const s = ttsData?.ttsSettings;
      if (!s) return;
      const voiceVal = (patch.voice ?? voice).trim() || DEFAULT_TTS_VOICE_ID;
      const speedVal = patch.speed !== undefined ? patch.speed : speed;
      const pitchVal = typeof s.pitch === "number" ? s.pitch : 1;
      if (patch.voice !== undefined) setVoice(patch.voice);
      if (patch.speed !== undefined) setSpeed(patch.speed);
      void updateTtsSettings({
        variables: {
          input: {
            userId,
            mode: s.mode,
            voice: voiceVal,
            model: s.model?.trim() || "kokoro",
            speed: speedVal,
            pitch: pitchVal,
          },
        },
      });
    },
    [ttsData?.ttsSettings, userId, voice, speed, updateTtsSettings]
  );

  const openAiPanel = useCallback(() => setAiOpen(true), []);

  const [updateProgress] = useMutation(UPDATE_PROGRESS, {
    refetchQueries: (res) => {
      const bid = res.data?.updateReadingProgress?.bookId;
      return bid != null ? [{ query: READER_BOOK_QUERY, variables: { id: bid, userId } }] : [];
    },
    awaitRefetchQueries: false,
  });

  const saveProgress = useCallback(
    (position: string, percentage: number) => {
      if (!bookId || numericBookId == null) return;
      updateProgress({
        variables: {
          input: { userId, bookId: numericBookId, position, percentage },
        },
      });
    },
    [bookId, numericBookId, userId, updateProgress]
  );

  const ttsPlayback = useTtsParagraphPlayback({
    userId,
    bookId: bookId ?? "",
    format: fileExt === "pdf" ? "pdf" : "epub",
    renditionRef,
    pdfDocRef,
    pdfPageRef,
    pdfNavigateRef,
    pdfScrollToReadingRef,
    voice,
    speed,
    pitch: ttsData?.ttsSettings?.pitch ?? 1,
    model: ttsData?.ttsSettings?.model ?? "kokoro",
    panelOpen: aiOpen,
    navRevision,
    openAiPanel,
    epubNavSuppressRef: epubTtsNavSuppressRef,
    onPersistReadingProgress: saveProgress,
    chunkLimits: readerTtsChunkLimits,
    pdfMarginStripEnabled,
    pdfMarginStripRegexes,
  });

  useEffect(() => {
    if (!aiOpen || !bookId) return;
    refetchTts();
  }, [aiOpen, bookId, refetchTts]);

  useEffect(() => {
    if (!aiOpen) ttsReaderHydratedForPanelOpenRef.current = false;
  }, [aiOpen]);

  useEffect(() => {
    ttsReaderHydratedForPanelOpenRef.current = false;
  }, [bookId]);

  useEffect(() => {
    if (!aiOpen || !ttsData?.ttsSettings) return;
    if (ttsReaderHydratedForPanelOpenRef.current) return;
    const s = ttsData.ttsSettings;
    const v = s.voice?.trim();
    setVoice(v && v.length > 0 ? v : DEFAULT_TTS_VOICE_ID);
    setSpeed(typeof s.speed === "number" ? s.speed : 1);
    ttsReaderHydratedForPanelOpenRef.current = true;
  }, [aiOpen, ttsData?.ttsSettings]);

  useEffect(() => {
    if (!aiOpen) return;
    let cancelled = false;
    const tok = getStoredToken();
    fetch(`/api/tts/voices?userId=${userId}`, { headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.voices || !Array.isArray(j.voices)) return;
        setVoiceOptions(j.voices.map((x: unknown) => String(x)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [aiOpen, ttsData?.ttsSettings?.mode, userId]);

  const progress = book?.readingProgressForUser;
  const savedPosition = progress?.position ?? null;
  const fallbackPct = progress?.percentage ?? 0;
  const resumeCfi = computeReaderResumeCfi(decodedHl, decodedBm, savedPosition);
  const pdfStoredPage = computePdfStoredPage(decodedHl, decodedBm, fileExt, savedPosition);
  const pdfBookmarkDomIndex = computePdfBookmarkDomIndex(decodedHl, decodedBm);

  const backHref = `/book/${bookId ?? ""}`;
  const toggleAi = useCallback(() => setAiOpen((p) => !p), []);

  const onPdfBookmarkContext = useCallback((ctx: { page: number; domIdx: number; clientX: number; clientY: number; highlight: PdfHighlightStored | null }) => {
    setBookmarkMenu({
      kind: "pdf",
      page: ctx.page,
      domIdx: ctx.domIdx,
      mouseX: ctx.clientX,
      mouseY: ctx.clientY,
      highlight: ctx.highlight,
    });
  }, []);

  const onEpubBookmarkContext = useCallback((target: Node, clientX: number, clientY: number, highlight: EpubHighlightMenu | null) => {
    setBookmarkMenu({ kind: "epub", target, mouseX: clientX, mouseY: clientY, highlight });
  }, []);

  const saveHighlightColor = useCallback(
    async (color: string) => {
      const m = bookmarkMenu;
      if (!m?.highlight || !bookId || numericBookId == null) return;
      const bid = numericBookId;
      setBookmarkMenu(null);
      try {
        if (m.kind === "pdf") {
          const { startPos, endPos } = encodePdfHighlightPositions(m.highlight);
          await addHighlightMut({
            variables: { input: { userId, bookId: bid, startPos, endPos, text: m.highlight.t, color } },
          });
          return;
        }
        const { startPos, endPos } = encodeEpubHighlightPositions(m.highlight.cfiRange);
        await addHighlightMut({
          variables: { input: { userId, bookId: bid, startPos, endPos, text: m.highlight.text, color } },
        });
      } catch {
        /* ignore */
      }
    },
    [bookmarkMenu, bookId, numericBookId, userId, addHighlightMut]
  );

  useReaderEpubHighlightAnnotations({
    fileExt,
    highlightsSig,
    renditionReadyTick,
    bookId,
    theme,
    bookHighlights,
    renditionRef,
    readerDarkDocument,
  });

  const openBookmarkNameModal = useCallback(() => {
    if (!bookmarkMenu) return;
    bookmarkPendingRef.current = bookmarkMenu;
    setBookmarkNameDraft("");
    setBookmarkModalOpen(true);
    setBookmarkMenu(null);
  }, [bookmarkMenu]);

  const saveNamedBookmark = useCallback(async () => {
    const pending = bookmarkPendingRef.current;
    if (!bookId || !pending || numericBookId == null) return;
    const bid = numericBookId;
    let position = "";
    if (pending.kind === "pdf") position = encodePdfBookmarkPosition(pending.page, pending.domIdx);
    else {
      const r = renditionRef.current;
      if (!r) return;
      const cfi = await epubResolveStartCfi(r);
      const ex = await extractEpubParagraphs(r, readerTtsChunkLimits);
      const pi = epubParagraphIndexForDomTarget(ex.highlightEls, pending.target);
      if (pi == null || !cfi.startsWith("epubcfi(")) return;
      position = encodeEpubBookmarkPosition(cfi, pi);
    }
    const note = bookmarkNameDraft.trim() || t("bookmarkDefaultName");
    await addBookmarkMut({
      variables: { input: { userId, bookId: bid, position, note } },
    });
    setBookmarkModalOpen(false);
    bookmarkPendingRef.current = null;
  }, [addBookmarkMut, bookId, numericBookId, userId, bookmarkNameDraft, readerTtsChunkLimits, t]);

  const closeBookmarkModal = useCallback(() => {
    setBookmarkModalOpen(false);
    bookmarkPendingRef.current = null;
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        height: { xs: "100dvh", md: "100vh" },
        minHeight: { xs: "100dvh", md: "100vh" },
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {bookLoading ? (
        <ReaderLoadingView backHref={backHref} aiOpen={aiOpen} onAiToggle={toggleAi} />
      ) : fileExt === "pdf" ? (
        <PdfBookViewer
          key={bookId}
          bookId={bookId ?? ""}
          storedPage={pdfStoredPage}
          savedPosition={savedPosition}
          fallbackPercentage={fallbackPct}
          onPersistProgress={saveProgress}
          suppressScrollProgressPersist={fileExt === "pdf" && aiOpen && ttsPlayback.playing}
          aiOpen={aiOpen}
          onAiToggle={toggleAi}
          onPdfDocumentLoad={onPdfDocumentLoad}
          onReadingPageChange={onReadingPageChange}
          ttsHighlightPage={aiOpen ? ttsPlayback.pdfHighlightPage : null}
          ttsHighlightItemIndices={aiOpen ? ttsPlayback.pdfHighlightItemIndices : []}
          ttsTextLayerTick={ttsPlayback.pdfTextLayerTick}
          ttsPlaying={ttsPlayback.playing}
          pdfNavigateRef={pdfNavigateRef}
          pdfScrollToReadingRef={pdfScrollToReadingRef}
          ttsReadingPageFallback={pdfPanelPage}
          onPdfTextPick={(p, itemIndex) => void ttsPlayback.seekFromPdfClick(p, itemIndex)}
          onPdfBookmarkContext={onPdfBookmarkContext}
          bookmarkScrollDomIndex={pdfBookmarkDomIndex}
          scrollResumeSig={`${bmRaw ?? ""}|${hlRaw ?? ""}`}
          bookHighlights={bookHighlights}
          readerDarkDocument={readerDarkDocument}
        />
      ) : (
        <EpubReaderView
          bookId={bookId ?? ""}
          resumeCfi={resumeCfi}
          fallbackPercentage={fallbackPct}
          onPersistProgress={saveProgress}
          onRenditionReady={onRenditionReady}
          onReaderLocationChanged={onEpubReaderLocationChanged}
          onEpubContentPick={(target) => void ttsPlayback.seekFromEpubClick(target)}
          onEpubBookmarkContext={onEpubBookmarkContext}
          ttsChunkLimits={readerTtsChunkLimits}
          scrollToParagraphIndex={decodedBm?.kind === "epub" ? decodedBm.paraIndex : null}
          bookmarkResumeSig={`${bmRaw ?? ""}|${hlRaw ?? ""}`}
          backHref={backHref}
          aiOpen={aiOpen}
          onAiToggle={toggleAi}
          readerDarkDocument={readerDarkDocument}
        />
      )}

      <ReaderBookmarkContextMenu bookmarkMenu={bookmarkMenu} onClose={() => setBookmarkMenu(null)} onSaveBookmark={openBookmarkNameModal} onPickHighlightColor={saveHighlightColor} t={t} />

      <ReaderBookmarkNameModal open={bookmarkModalOpen} bookmarkNameDraft={bookmarkNameDraft} setBookmarkNameDraft={setBookmarkNameDraft} onClose={closeBookmarkModal} onSave={saveNamedBookmark} t={t} />

      {bookId && (
        <TtsReaderPanel
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          playback={ttsPlayback}
          ttsData={ttsData}
          voice={voice}
          setVoice={setVoice}
          commitPlayback={commitPlayback}
          speed={speed}
          setSpeed={setSpeed}
          voiceOptions={voiceOptions}
          bookTitle={book?.title ?? null}
          readerFormat={fileExt === "pdf" ? "pdf" : "epub"}
          pdfPage={pdfPanelPage}
          pdfNumPages={pdfPanelNumPages}
          onScrollToReading={() => ttsPlayback.scrollToCurrentReading()}
          scrollToReadingEnabled={ttsPlayback.totalParas > 0}
        />
      )}
    </Box>
  );
};

export default ReaderPage;
