import { chunkNavIconButtonSx, ttsPlayPauseIconButtonSx } from "./ttsReaderPanelStyles";
import { Box, CircularProgress, IconButton, Typography } from "@mui/material";
import SkipPrevious from "@mui/icons-material/SkipPrevious";
import MyLocation from "@mui/icons-material/MyLocation";
import PlayArrow from "@mui/icons-material/PlayArrow";
import SkipNext from "@mui/icons-material/SkipNext";
import Pause from "@mui/icons-material/Pause";

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
  pageProgressLabel: string | null;
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
  pageProgressLabel,
}: TtsReaderPanelTransportRowProps) => {
  const counterLabel =
    pageProgressLabel ?? (totalParas > 0 ? `${paraIndex + 1} / ${totalParas}` : null);
  const playAria = busy ? loadingLabel : playing ? pauseLabel : playLabel;

  const transportCluster = (
    <>
      <IconButton type="button" size="small" aria-label={prevLabel} disabled={busy || totalParas === 0 || paraIndex <= 0} onClick={onPrev} sx={(th) => chunkNavIconButtonSx(th, compact)}>
        <SkipPrevious fontSize="inherit" />
      </IconButton>
      <IconButton type="button" disabled={busy} onClick={onTogglePlay} aria-label={playAria} size="small" sx={(th) => ttsPlayPauseIconButtonSx(th, compact)}>
        {busy ? <CircularProgress size={18} color="inherit" /> : playing ? <Pause fontSize="inherit" /> : <PlayArrow fontSize="inherit" />}
      </IconButton>
      <IconButton type="button" size="small" aria-label={nextLabel} disabled={busy || totalParas === 0 || paraIndex >= totalParas - 1} onClick={onNext} sx={(th) => chunkNavIconButtonSx(th, compact)}>
        <SkipNext fontSize="inherit" />
      </IconButton>
      {!compact ? (
        <IconButton type="button" size="small" aria-label={scrollToReadingLabel} disabled={!scrollToReadingEnabled} onClick={onScrollToReading} sx={(th) => chunkNavIconButtonSx(th, false)}>
          <MyLocation fontSize="small" />
        </IconButton>
      ) : null}
    </>
  );

  if (compact)
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          alignItems: "center",
          justifyItems: "center",
          width: "100%",
        }}
      >
        {transportCluster}
      </Box>
    );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        columnGap: { xs: 0.5, sm: 0.75 },
        width: "100%",
      }}
    >
      <Box aria-hidden />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: { xs: 0.5, sm: 1 },
          transform: { xs: "translateX(-10px)", sm: "translateX(-14px)" },
        }}
      >
        {transportCluster}
      </Box>
      {counterLabel ? (
        <Typography
          component="span"
          variant="body2"
          sx={{
            justifySelf: "end",
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            userSelect: "none",
            whiteSpace: "nowrap",
            pl: { xs: 0.25, sm: 0.5 },
          }}
        >
          {counterLabel}
        </Typography>
      ) : (
        <Box aria-hidden />
      )}
    </Box>
  );
};