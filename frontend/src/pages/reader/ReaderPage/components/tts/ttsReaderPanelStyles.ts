import { alpha, type Theme } from "@mui/material/styles";

import { TTS_READER_PANEL_MOTION_MS } from "./ttsReaderPanelConstants";

export const sharedTtsPanelSurface = (th: Theme) => ({
  borderRadius: { xs: "10px", sm: "12px" },
  bgcolor: alpha(th.surfaces.highest, th.palette.mode === "light" ? 0.97 : 0.92),
  backdropFilter: "blur(24px)",
  border: `1px solid ${alpha(th.palette.divider, 0.35)}`,
  boxShadow: `0 0 40px 0 ${alpha(th.palette.primary.main, 0.08)}`,
});

const compactTransportControlSize = { xs: 32, sm: 34 } as const;

export const ttsPlayPauseIconButtonSx = (th: Theme, compact = false) => ({
  flexShrink: 0,
  width: compact ? compactTransportControlSize : { xs: 30, sm: 32 },
  height: compact ? compactTransportControlSize : { xs: 30, sm: 32 },
  p: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: th.palette.primary.contrastText,
  borderRadius: "50%",
  background: th.palette.mode === "light" ? `linear-gradient(135deg, ${th.palette.primary.main}, #5b21b6)` : "linear-gradient(135deg, #ba9eff, #8455ef)",
  "&:hover": { filter: "brightness(1.08)" },
  "&:disabled": { opacity: 0.5 },
  "& .MuiSvgIcon-root": { fontSize: compact ? { xs: 20, sm: 22 } : { xs: 20, sm: 22 } },
});

export const ttsReaderPanelExpandedPaperSx = (th: Theme) => ({
  position: "fixed",
  bottom: { xs: 72, sm: 96 },
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: th.zIndex.modal,
  width: "100%",
  maxWidth: { xs: "min(480px, calc(100vw - 16px))", sm: "min(480px, 90vw)" },
  display: "flex",
  flexDirection: "column",
  gap: { xs: 1, sm: 1.5 },
  p: { xs: 1.25, sm: 2 },
  borderRadius: { xs: "10px", sm: "12px" },
  bgcolor: alpha(th.surfaces.highest, th.palette.mode === "light" ? 0.97 : 0.92),
  backdropFilter: "blur(24px)",
  border: `1px solid ${alpha(th.palette.divider, 0.35)}`,
  boxShadow: `0 0 40px 0 ${alpha(th.palette.primary.main, 0.08)}`,
  overflow: "hidden",
  transition: th.transitions.create(["max-width", "width", "padding", "gap"], {
    duration: TTS_READER_PANEL_MOTION_MS,
    easing: th.transitions.easing.easeInOut,
  }),
});

export const ttsReaderPanelCompactRowSx = (th: Theme) => ({
  position: "fixed",
  bottom: { xs: 72, sm: 96 },
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: th.zIndex.modal,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 1,
});

export const ttsReaderPanelCompactMainPaperSx = (th: Theme) => ({
  ...sharedTtsPanelSurface(th),
  width: "max-content",
  minWidth: { xs: 132, sm: 138 },
  maxWidth: "min(148px, calc(100vw - 16px))",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: { xs: 0.5, sm: 0.75 },
  p: { xs: "8px 12px", sm: "9px 12px" },
  overflow: "hidden",
  transition: th.transitions.create(["max-width", "width", "padding", "gap"], {
    duration: TTS_READER_PANEL_MOTION_MS,
    easing: th.transitions.easing.easeInOut,
  }),
});

export const ttsReaderPanelCompactClosePaperSx = (th: Theme) => ({
  ...sharedTtsPanelSurface(th),
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  p: 0.5,
});

export const chunkNavIconButtonSx = (theme: Theme, compact = false) => ({
  flexShrink: 0,
  width: compact ? compactTransportControlSize : { xs: 34, sm: 40 },
  height: compact ? compactTransportControlSize : { xs: 34, sm: 40 },
  minWidth: compact ? compactTransportControlSize : { xs: 34, sm: 40 },
  ...(compact
    ? {
        p: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        "& .MuiSvgIcon-root": { fontSize: { xs: 20, sm: 22 } },
      }
    : {}),
  color: "text.primary",
  bgcolor: theme.surfaces.highest,
  transition: theme.transitions.create("background-color", { duration: theme.transitions.duration.shortest }),
  "&:disabled": { opacity: 0.5 },
  "&:hover:not(:disabled)": { bgcolor: alpha(theme.palette.common.white, 0.12) },
  "&:active:not(:disabled)": { bgcolor: alpha(theme.palette.secondary.main, 0.38) },
  "&:focus-visible": { outline: `2px solid ${theme.palette.secondary.main}`, outlineOffset: 2 },
});

export const kokoroVoiceRowSx = { fontSize: { xs: 14, sm: 16 }, flexShrink: 0, opacity: 0.92, color: "text.secondary" };
