import { useAuth } from "../../auth/AuthContext";
import { useTtsParagraphPlayback } from "../../hooks/useTtsParagraphPlayback";
import { getFileExt } from "../../utils/cover/cover";
import { READER_BOOK_QUERY, READER_HIGHLIGHTS } from "./readerQueries";
import { ReaderOverlays } from "./ReaderPage/components/ReaderOverlays";
import { ReaderContent } from "./ReaderPage/components/ReaderContent";
import { computePdfBookmarkDomIndex, computePdfStoredPage, computeReaderResumeCfi } from "./readerResumePositions";
import { useReaderEpubHighlightAnnotations } from "./ReaderPage/epub/useReaderEpubHighlightAnnotations";
import { useReaderProgressSaver } from "./ReaderPage/hooks/useReaderProgressSaver";
import { useReaderBookmarkActions } from "./ReaderPage/hooks/useReaderBookmarkActions";
import { useReaderTtsSettings } from "./ReaderPage/hooks/useReaderTtsSettings";
import { useReaderDocState } from "./ReaderPage/hooks/useReaderDocState";
import { useReaderNavParams } from "./useReaderNavParams";
import { useQuery } from "@apollo/client";
import { Box, useTheme } from "@mui/material";
import { useState, useCallback, useMemo } from "react";
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
  const [readerPanelOpen, setReaderPanelOpen] = useState(searchParams.get("ai") === "1");
  const doc = useReaderDocState(bookId);

  const { data: highlightsData } = useQuery<{
    highlights: { id: number; startPos: string; endPos: string; text: string; color: string }[];
  }>(READER_HIGHLIGHTS, { variables: { bookId: numericBookId ?? 0 }, skip: !bookId });
  const bookHighlights = highlightsData?.highlights ?? [];
  const highlightsSig = useMemo(() => bookHighlights.map((h) => `${h.id}:${h.startPos}:${h.color}`).join("|"), [bookHighlights]);

  const onEpubReaderLocationChanged = useCallback(() => {
    if (doc.epubTtsNavSuppressRef.current) return;
    if (aiOpen) return;
    doc.bumpNav();
  }, [doc, aiOpen]);

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

  const tts = useReaderTtsSettings({ userId, bookId, aiOpen, bookMetadata: book?.metadata ?? null });

  const openAiPanel = useCallback(() => {
    setAiOpen(true);
    setReaderPanelOpen(true);
  }, []);

  const saveProgress = useReaderProgressSaver({ bookId, numericBookId, userId });

  const ttsPlayback = useTtsParagraphPlayback({
    userId,
    bookId: bookId ?? "",
    format: fileExt === "pdf" ? "pdf" : "epub",
    renditionRef: doc.renditionRef,
    pdfDocRef: doc.pdfDocRef,
    pdfPageRef: doc.pdfPageRef,
    pdfNavigateRef: doc.pdfNavigateRef,
    pdfScrollToReadingRef: doc.pdfScrollToReadingRef,
    voice: tts.voice,
    speed: tts.speed,
    pitch: tts.ttsData?.ttsSettings?.pitch ?? 1,
    model: tts.ttsData?.ttsSettings?.model ?? "kokoro",
    panelOpen: aiOpen,
    navRevision: doc.navRevision,
    openAiPanel,
    epubNavSuppressRef: doc.epubTtsNavSuppressRef,
    onPersistReadingProgress: saveProgress,
    chunkLimits: tts.readerTtsChunkLimits,
    pdfMarginStripEnabled: tts.pdfMarginStripEnabled,
    pdfMarginStripRegexes: tts.pdfMarginStripRegexes,
  });

  const openReaderFromWave = useCallback(() => {
    setReaderPanelOpen(true);
    if (!aiOpen) {
      setAiOpen(true);
      requestAnimationFrame(() => void ttsPlayback.togglePlay());
    }
  }, [aiOpen, ttsPlayback]);

  const openReaderPanelFromWave = useCallback(() => {
    setReaderPanelOpen(true);
    if (!aiOpen) setAiOpen(true);
  }, [aiOpen]);

  const togglePlayFromWave = useCallback(() => {
    if (!aiOpen) setAiOpen(true);
    requestAnimationFrame(() => void ttsPlayback.togglePlay());
  }, [aiOpen, ttsPlayback]);

  const closeReaderPanel = useCallback(() => setReaderPanelOpen(false), []);

  const closeAi = useCallback(() => {
    if (ttsPlayback.playing) ttsPlayback.togglePlay();
    setAiOpen(false);
    setReaderPanelOpen(false);
  }, [ttsPlayback]);

  const progress = book?.readingProgressForUser;
  const savedPosition = progress?.position ?? null;
  const fallbackPct = progress?.percentage ?? 0;
  const resumeCfi = computeReaderResumeCfi(decodedHl, decodedBm, savedPosition);
  const pdfStoredPage = computePdfStoredPage(decodedHl, decodedBm, fileExt, savedPosition);
  const pdfBookmarkDomIndex = computePdfBookmarkDomIndex(decodedHl, decodedBm);
  const backHref = `/book/${bookId ?? ""}`;
  const scrollSig = `${bmRaw ?? ""}|${hlRaw ?? ""}`;

  const bookmarks = useReaderBookmarkActions({
    bookId,
    numericBookId,
    userId,
    renditionRef: doc.renditionRef,
    readerTtsChunkLimits: tts.readerTtsChunkLimits,
    t,
  });

  useReaderEpubHighlightAnnotations({
    fileExt,
    highlightsSig,
    renditionReadyTick: doc.renditionReadyTick,
    bookId,
    theme,
    bookHighlights,
    renditionRef: doc.renditionRef,
    readerDarkDocument: tts.readerDarkDocument,
  });

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
      <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
        <ReaderContent
        bookLoading={bookLoading}
        fileExt={fileExt}
        bookId={bookId}
        backHref={backHref}
        aiOpen={aiOpen}
        readerPanelOpen={readerPanelOpen}
        onAiToggle={openReaderFromWave}
        onAiTap={togglePlayFromWave}
        onAiLongPress={openReaderPanelFromWave}
        pdfStoredPage={pdfStoredPage}
        savedPosition={savedPosition}
        fallbackPct={fallbackPct}
        onPersistProgress={saveProgress}
        onPdfDocumentLoad={doc.onPdfDocumentLoad}
        onReadingPageChange={doc.onReadingPageChange}
        pdfNavigateRef={doc.pdfNavigateRef}
        pdfScrollToReadingRef={doc.pdfScrollToReadingRef}
        pdfPanelPage={doc.pdfPanelPage}
        pdfBookmarkDomIndex={pdfBookmarkDomIndex}
        scrollResumeSig={scrollSig}
        bookHighlights={bookHighlights}
        readerDarkDocument={tts.readerDarkDocument}
        onPdfBookmarkContext={bookmarks.onPdfBookmarkContext}
        resumeCfi={resumeCfi}
        onRenditionReady={doc.onRenditionReady}
        onEpubReaderLocationChanged={onEpubReaderLocationChanged}
        onEpubBookmarkContext={bookmarks.onEpubBookmarkContext}
        ttsChunkLimits={tts.readerTtsChunkLimits}
        scrollToParagraphIndex={decodedBm?.kind === "epub" ? decodedBm.paraIndex : null}
        bookmarkResumeSig={scrollSig}
        ttsPlayback={ttsPlayback}
        decodedBm={decodedBm}
        />
      </Box>

      <ReaderOverlays
        bookmarks={bookmarks}
        t={t}
        bookId={bookId}
        readerPanelOpen={readerPanelOpen}
        onCloseReaderPanel={closeReaderPanel}
        onCloseAi={closeAi}
        ttsPlayback={ttsPlayback}
        ttsData={tts.ttsData}
        voice={tts.voice}
        setVoice={tts.setVoice}
        commitPlayback={tts.commitPlayback}
        speed={tts.speed}
        setSpeed={tts.setSpeed}
        voiceOptions={tts.voiceOptions}
        bookTitle={book?.title ?? null}
        readerFormat={fileExt === "pdf" ? "pdf" : "epub"}
        pdfPage={doc.pdfPanelPage}
        pdfNumPages={doc.pdfPanelNumPages}
      />
    </Box>
  );
};

export default ReaderPage;
