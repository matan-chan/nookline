import { ReaderBottomBar } from "../../components/ReaderBottomBar";
import { CoverShimmerSkeleton } from "../../components/cover/CoverShimmerSkeleton";
import { Box, Skeleton, Stack } from "@mui/material";

type ReaderLoadingViewProps = {
  backHref: string;
  readerPanelOpen: boolean;
  onAiToggle: () => void;
  onAiTap?: () => void;
  onAiLongPress?: () => void;
  ttsPlaying?: boolean;
  ttsBusy?: boolean;
  ttsAudioRef?: React.RefObject<HTMLAudioElement | null>;
};

export const ReaderLoadingView = ({ backHref, readerPanelOpen, onAiToggle, onAiTap, onAiLongPress, ttsPlaying, ttsBusy, ttsAudioRef }: ReaderLoadingViewProps) => (
  <Box sx={{ position: "relative", display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
    <Box sx={{ display: "flex", minHeight: 0, flex: 1, alignItems: "center", justifyContent: "center", px: 2 }}>
      <Stack spacing={2} sx={{ width: "min(100%, 420px)" }}>
        <Box sx={{ aspectRatio: "3/4", borderRadius: 2, overflow: "hidden", maxHeight: "min(52vh, 520px)" }}>
          <CoverShimmerSkeleton />
        </Box>
        <Skeleton variant="text" height={28} width="88%" animation="wave" />
        <Skeleton variant="text" height={20} width="64%" animation="wave" />
      </Stack>
    </Box>
    <ReaderBottomBar backHref={backHref} readerPanelOpen={readerPanelOpen} onAiToggle={onAiToggle} onAiTap={onAiTap} onAiLongPress={onAiLongPress} ttsPlaying={ttsPlaying} ttsBusy={ttsBusy} ttsAudioRef={ttsAudioRef} />
  </Box>
);
