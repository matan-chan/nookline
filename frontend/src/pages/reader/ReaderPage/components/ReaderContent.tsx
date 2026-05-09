import PdfBookViewer from "../../../../components/PdfBookViewer";
import { ReaderLoadingView } from "../../ReaderLoadingView";
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
  onAiToggle: () => void;
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
  if (props.bookLoading) return <ReaderLoadingView backHref={props.backHref} aiOpen={props.aiOpen} onAiToggle={props.onAiToggle} />;

  if (props.fileExt === "pdf")
    return (
      <PdfBookViewer
        key={props.bookId}
        bookId={props.bookId ?? ""}
        storedPage={props.pdfStoredPage}
        savedPosition={props.savedPosition}
        fallbackPercentage={props.fallbackPct}
        onPersistProgress={props.onPersistProgress}
        suppressScrollProgressPersist={props.aiOpen && props.ttsPlayback.playing}
        aiOpen={props.aiOpen}
        onAiToggle={props.onAiToggle}
        onPdfDocumentLoad={props.onPdfDocumentLoad}
        onReadingPageChange={props.onReadingPageChange}
        ttsHighlightPage={props.aiOpen ? props.ttsPlayback.pdfHighlightPage : null}
        ttsHighlightItemIndices={props.aiOpen ? props.ttsPlayback.pdfHighlightItemIndices : []}
        ttsTextLayerTick={props.ttsPlayback.pdfTextLayerTick}
        ttsPlaying={props.ttsPlayback.playing}
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
      aiOpen={props.aiOpen}
      onAiToggle={props.onAiToggle}
      readerDarkDocument={props.readerDarkDocument}
    />
  );
};
