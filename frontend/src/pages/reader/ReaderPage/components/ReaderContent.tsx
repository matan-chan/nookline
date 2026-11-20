import PdfBookViewer from "../../../../components/PdfBookViewer";
import { ReaderLoadingView } from "../../ReaderLoadingView";
import { Box } from "@mui/material";
import { EpubReaderView } from "../epub/EpubReaderView";
import type { PdfHighlightStored } from "../../../../utils/reader/readerHighlightPosition";
import type { EpubHighlightMenu } from "../../readerPageTypes";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Rendition } from "epubjs";

type ChunkLimits = { minChars: number; maxChars: number; periodScanExtra: number };
type DecodedBookmark = { kind: "epub"; paraIndex: number } | { kind: "pdf" } | null;
type BookHighlight = { id: number; startPos: string; endPos: string; text: string; color: string };

type TtsRuntime = {
  playing: boolean;
  busy: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  pdfHighlightPage: number | null;
  pdfHighlightItemIndices: number[];
  pdfTextLayerTick: number;
  totalParas: number;
  seekFromPdfClick: (page: number, itemIndex: number) => unknown;
  seekFromEpubClick: (target: Node) => unknown;
};

type Props = {
  bookLoading: boolean;
  fileExt: string | null;
  bookId: string | undefined;
  backHref: string;
  aiOpen: boolean;
  readerPanelOpen: boolean;
  onAiToggle: () => void;
  onAiTap?: () => void;
  onAiLongPress?: () => void;
  pdfStoredPage: number | null;
  savedPosition: string | null;
  fallbackPct: number;
  onPersistProgress: (position: string, percentage: number) => void;
  onPdfDocumentLoad: (doc: PDFDocumentProxy) => void;
  onReadingPageChange: (page: number, source?: "scroll" | "tts" | "button") => void;
  pdfNavigateRef: React.MutableRefObject<((page: number) => void) | null>;
  pdfScrollToReadingRef: React.MutableRefObject<(() => void) | null>;
  pdfPanelPage: number;
  pdfBookmarkDomIndex: number | null;
  scrollResumeSig: string;
  bookHighlights: BookHighlight[];
  readerDarkDocument: boolean;
  onPdfBookmarkContext: (ctx: { page: number; domIdx: number; clientX: number; clientY: number; highlight: PdfHighlightStored | null }) => void;
  resumeCfi: string | null;
  onRenditionReady: (r: Rendition) => void;
  onEpubReaderLocationChanged: () => void;
  onEpubBookmarkContext: (target: Node, clientX: number, clientY: number, highlight: EpubHighlightMenu | null) => void;
  ttsChunkLimits: ChunkLimits;
  scrollToParagraphIndex: number | null;
  bookmarkResumeSig: string;
  ttsPlayback: TtsRuntime;
  decodedBm: DecodedBookmark;
};

export const ReaderContent = (props: Props) => {
  if (props.bookLoading)
    return (
      <ReaderLoadingView
        backHref={props.backHref}
        readerPanelOpen={props.readerPanelOpen}
        onAiToggle={props.onAiToggle}
        onAiTap={props.onAiTap}
        onAiLongPress={props.onAiLongPress}
        ttsPlaying={props.ttsPlayback.playing}
        ttsBusy={props.ttsPlayback.busy}
        ttsAudioRef={props.ttsPlayback.audioRef}
      />
    );

  if (props.fileExt === "pdf")
    return (
      <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", width: "100%" }}>
      <PdfBookViewer
        key={props.bookId}
        bookId={props.bookId ?? ""}
        storedPage={props.pdfStoredPage}
        savedPosition={props.savedPosition}
        fallbackPercentage={props.fallbackPct}
        onPersistProgress={props.onPersistProgress}
        suppressScrollProgressPersist={props.aiOpen && props.ttsPlayback.playing}
        aiOpen={props.aiOpen}
        readerPanelOpen={props.readerPanelOpen}
        onAiToggle={props.onAiToggle}
        onAiTap={props.onAiTap}
        onAiLongPress={props.onAiLongPress}
        onPdfDocumentLoad={props.onPdfDocumentLoad}
        onReadingPageChange={props.onReadingPageChange}
        ttsHighlightPage={props.aiOpen ? props.ttsPlayback.pdfHighlightPage : null}
        ttsHighlightItemIndices={props.aiOpen ? props.ttsPlayback.pdfHighlightItemIndices : []}
        ttsTextLayerTick={props.ttsPlayback.pdfTextLayerTick}
        ttsPlaying={props.ttsPlayback.playing}
        ttsBusy={props.ttsPlayback.busy}
        ttsAudioRef={props.ttsPlayback.audioRef}
        pdfNavigateRef={props.pdfNavigateRef}
        pdfScrollToReadingRef={props.pdfScrollToReadingRef}
        ttsReadingPageFallback={props.pdfPanelPage}
        onPdfTextPick={(p, itemIndex) => void props.ttsPlayback.seekFromPdfClick(p, itemIndex)}
        onPdfBookmarkContext={props.onPdfBookmarkContext}
        bookmarkScrollDomIndex={props.pdfBookmarkDomIndex}
        scrollResumeSig={props.scrollResumeSig}
        bookHighlights={props.bookHighlights}
        readerDarkDocument={props.readerDarkDocument}
      />
      </Box>
    );

  return (
    <EpubReaderView
      bookId={props.bookId ?? ""}
      resumeCfi={props.resumeCfi}
      fallbackPercentage={props.fallbackPct}
      onPersistProgress={props.onPersistProgress}
      onRenditionReady={props.onRenditionReady}
      onReaderLocationChanged={props.onEpubReaderLocationChanged}
      onEpubContentPick={(target) => void props.ttsPlayback.seekFromEpubClick(target)}
      onEpubBookmarkContext={props.onEpubBookmarkContext}
      ttsChunkLimits={props.ttsChunkLimits}
      scrollToParagraphIndex={props.scrollToParagraphIndex}
      bookmarkResumeSig={props.bookmarkResumeSig}
      backHref={props.backHref}
      readerPanelOpen={props.readerPanelOpen}
      onAiToggle={props.onAiToggle}
      onAiTap={props.onAiTap}
      onAiLongPress={props.onAiLongPress}
      ttsPlaying={props.ttsPlayback.playing}
      ttsBusy={props.ttsPlayback.busy}
      ttsAudioRef={props.ttsPlayback.audioRef}
      readerDarkDocument={props.readerDarkDocument}
    />
  );
};
