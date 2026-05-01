import { chunkNavIconButtonSx, ttsPlayPauseIconButtonSx } from "./ttsReaderPanelStyles";
import { Box, CircularProgress, IconButton } from "@mui/material";
import SkipPrevious from "@mui/icons-material/SkipPrevious";
import MyLocation from "@mui/icons-material/MyLocation";
import PlayArrow from "@mui/icons-material/PlayArrow";
import SkipNext from "@mui/icons-material/SkipNext";
import Pause from "@mui/icons-material/Pause";
import { alpha } from "@mui/material/styles";

type TtsReaderPanelTransportRowProps = {
  compact: boolean;
  playing: boolean;
  busy: boolean;
  totalParas: number;
  paraIndex: number;
  prevLabel: string;
  nextLabel: string;
  playLabel: string;
  pauseLabel: string;
  loadingLabel: string;
  scrollToReadingLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onScrollToReading: () => void;
  scrollToReadingEnabled: boolean;
};

export const TtsReaderPanelTransportRow = ({
  compact,
  playing,
  busy,
  totalParas,
  paraIndex,
  prevLabel,
  nextLabel,
  playLabel,
  pauseLabel,
  loadingLabel,
  onPrev,
  onNext,
  onTogglePlay,
  onScrollToReading,
  scrollToReadingLabel,
  scrollToReadingEnabled,
}: TtsReaderPanelTransportRowProps) => {
  const playAria = busy ? loadingLabel : playing ? pauseLabel : playLabel;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: compact ? { xs: 0.25, sm: 0.5 } : { xs: 0.5, sm: 1 },
        width: compact ? "auto" : "100%",
      }}
    >
      <IconButton type="button" size="small" aria-label={prevLabel} disabled={busy || totalParas === 0 || paraIndex <= 0} onClick={onPrev} sx={(th) => chunkNavIconButtonSx(th, compact)}>
        <SkipPrevious fontSize="inherit" />
      </IconButton>
      <IconButton type="button" disabled={busy} onClick={onTogglePlay} aria-label={playAria} size="small" sx={(th) => ttsPlayPauseIconButtonSx(th)}>
        {busy ? <CircularProgress size={18} color="inherit" /> : playing ? <Pause fontSize="inherit" /> : <PlayArrow fontSize="inherit" sx={{ pl: 0.25 }} />}
      </IconButton>
      <IconButton type="button" size="small" aria-label={nextLabel} disabled={busy || totalParas === 0 || paraIndex >= totalParas - 1} onClick={onNext} sx={(th) => chunkNavIconButtonSx(th, compact)}>
        <SkipNext fontSize="inherit" />
      </IconButton>
      {!compact ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 }, flex: 1, minWidth: 0 }}>
          <IconButton type="button" size="small" aria-label={scrollToReadingLabel} disabled={!scrollToReadingEnabled} onClick={onScrollToReading} sx={(th) => chunkNavIconButtonSx(th, false)}>
            <MyLocation fontSize="small" />
          </IconButton>
          <Box sx={(th) => ({ flex: 1, height: 6, borderRadius: 9999, bgcolor: alpha(th.palette.divider, 0.45), overflow: "hidden", minWidth: 48 })}>
            <Box
              sx={(th) => ({
                height: "100%",
                width: totalParas > 0 ? `${((paraIndex + 1) / totalParas) * 100}%` : 0,
                borderRadius: 9999,
                bgcolor: "secondary.main",
                transition: th.transitions.create("width", { duration: th.transitions.duration.shorter }),
              })}
            />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};
