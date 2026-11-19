import type { RefObject } from "react";
import type { TtsChunkLimits } from "../../../../utils/readerText/constants";
import { ReaderBottomBar } from "../../../../components/ReaderBottomBar";
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
  readerPanelOpen: boolean;
  onAiToggle: () => void;
  onAiTap?: () => void;
  onAiLongPress?: () => void;
  ttsPlaying?: boolean;
  ttsBusy?: boolean;
  ttsAudioRef?: RefObject<HTMLAudioElement | null>;
  readerDarkDocument?: boolean;
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
  readerPanelOpen,
  onAiToggle,
  onAiTap,
  onAiLongPress,
  ttsPlaying = false,
  ttsBusy = false,
  ttsAudioRef,
  readerDarkDocument = false,
}: EpubReaderViewProps) => (
  <Box sx={{ position: "relative", display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
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
        readerDarkDocument={readerDarkDocument}
      />
    </Box>
    <ReaderBottomBar backHref={backHref} readerPanelOpen={readerPanelOpen} onAiToggle={onAiToggle} onAiTap={onAiTap} onAiLongPress={onAiLongPress} ttsPlaying={ttsPlaying} ttsBusy={ttsBusy} ttsAudioRef={ttsAudioRef} />
  </Box>
);
