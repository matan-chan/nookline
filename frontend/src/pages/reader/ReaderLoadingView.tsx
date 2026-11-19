import { ReaderBottomBar } from "../../components/ReaderBottomBar";
import { Box, CircularProgress } from "@mui/material";

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
    <Box sx={{ display: "flex", minHeight: 0, flex: 1, alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
    <ReaderBottomBar backHref={backHref} readerPanelOpen={readerPanelOpen} onAiToggle={onAiToggle} onAiTap={onAiTap} onAiLongPress={onAiLongPress} ttsPlaying={ttsPlaying} ttsBusy={ttsBusy} ttsAudioRef={ttsAudioRef} />
  </Box>
);
