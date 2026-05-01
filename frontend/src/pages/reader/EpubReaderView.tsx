import type { TtsChunkLimits } from "../../utils/readerText/constants";
import { ReaderBottomBar } from "../../components/ReaderBottomBar";
import { Box } from "@mui/material";
import type { Rendition } from "epubjs";
import { EpubViewer } from "./EpubViewer";

type EpubReaderViewProps = {
  bookId: string;
  resumeCfi: string | null;
  fallbackPercentage: number;
  onPersistProgress: (position: string, percentage: number) => void;
  onRenditionReady: (r: Rendition) => void;
  onReaderLocationChanged: () => void;
  onEpubContentPick: (target: Node) => void;
  onEpubBookmarkContext?: (
    target: Node,
    clientX: number,
    clientY: number,
    highlight: { cfiRange: string; text: string } | null,
  ) => void;
  ttsChunkLimits: TtsChunkLimits;
  scrollToParagraphIndex?: number | null;
  bookmarkResumeSig?: string;
  backHref: string;
  aiOpen: boolean;
  onAiToggle: () => void;
};

export const EpubReaderView = ({
  bookId,
  resumeCfi,
  fallbackPercentage,
  onPersistProgress,
  onRenditionReady,
  onReaderLocationChanged,
  onEpubContentPick,
  onEpubBookmarkContext,
  ttsChunkLimits,
  scrollToParagraphIndex,
  bookmarkResumeSig,
  backHref,
  aiOpen,
  onAiToggle,
}: EpubReaderViewProps) => (
  <>
    <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <EpubViewer
        key={bookId}
        bookId={bookId}
        resumeCfi={resumeCfi}
        fallbackPercentage={fallbackPercentage}
        onPersistProgress={onPersistProgress}
        onRenditionReady={onRenditionReady}
        onReaderLocationChanged={onReaderLocationChanged}
        onEpubContentPick={onEpubContentPick}
        onEpubBookmarkContext={onEpubBookmarkContext}
        ttsChunkLimits={ttsChunkLimits}
        scrollToParagraphIndex={scrollToParagraphIndex}
        bookmarkResumeSig={bookmarkResumeSig}
      />
    </Box>
    <ReaderBottomBar backHref={backHref} aiOpen={aiOpen} onAiToggle={onAiToggle} />
  </>
);
