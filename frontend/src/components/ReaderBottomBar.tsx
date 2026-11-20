import type { ReactNode, RefObject } from "react";
import { useReaderAiWavePress } from "./readerBottomBar/useReaderAiWavePress";
import { useAudioWaveLevels } from "../hooks/useAudioWaveLevels";
import { SoundWaveIcon } from "./SoundWaveIcon";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { Box, Button, CircularProgress, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const readerChromePurple = "#6d28d9";
const readerChromePurpleActiveBg = "#ede9fe";
const readerChromePurpleHover = "#5b21b6";

export const ReaderBottomBar = ({
  backHref,
  trailingEnd,
  readerPanelOpen,
  onAiToggle,
  onAiTap,
  onAiLongPress,
  ttsPlaying = false,
  ttsBusy = false,
  ttsAudioRef,
}: {
  backHref: string;
  trailingEnd?: ReactNode;
  readerPanelOpen: boolean;
  onAiToggle: () => void;
  onAiTap?: () => void;
  onAiLongPress?: () => void;
  ttsPlaying?: boolean;
  ttsBusy?: boolean;
  ttsAudioRef?: RefObject<HTMLAudioElement | null>;
}) => {
  const theme = useTheme();
  const mobilePressSplit = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation("reader");
  const waveLevels = useAudioWaveLevels(ttsAudioRef ?? { current: null }, ttsPlaying);
  const activeVoice = readerPanelOpen || ttsPlaying || ttsBusy;
  const wavePress = useReaderAiWavePress({
    mobilePressSplit,
    disabled: ttsBusy,
    onShort: onAiTap ?? onAiToggle,
    onLong: onAiLongPress ?? onAiToggle,
    onDesktopClick: onAiTap ?? onAiToggle,
  });

  return (
    <Box
      sx={(th) => ({
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: th.zIndex.appBar,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        columnGap: 1,
        minHeight: { xs: 52, sm: 56 },
        px: { xs: 1.5, sm: 2 },
        py: { xs: 0.75, sm: 1 },
        pb: `max(${th.spacing(0.75)}, env(safe-area-inset-bottom, 0px))`,
        bgcolor: "transparent",
        pointerEvents: "none",
        "& > *": { pointerEvents: "auto" },
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", minWidth: 0 }}>
        <Button
          component={Link}
          to={backHref}
          size="small"
          color="inherit"
          aria-label={t("back")}
          startIcon={<ArrowBack fontSize="small" />}
          sx={{
            flexShrink: 0,
            textTransform: "none",
            color: readerChromePurple,
            "&:hover": { color: readerChromePurpleHover },
            minWidth: { xs: 40, sm: "auto" },
            px: { xs: 0.75, sm: 1.5 },
            "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.5 }, ml: { xs: 0, sm: -0.25 }, color: "inherit" },
            "& .MuiSvgIcon-root": { fontSize: 22, opacity: 1 },
          }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            {t("back")}
          </Box>
        </Button>
      </Box>
      <IconButton
        type="button"
        onClick={wavePress.onClick}
        onPointerDown={wavePress.onPointerDown}
        onPointerUp={wavePress.onPointerUp}
        onPointerCancel={wavePress.onPointerCancel}
        onPointerLeave={wavePress.onPointerLeave}
        onContextMenu={wavePress.onContextMenu}
        aria-label={t("aiReader")}
        aria-pressed={readerPanelOpen || ttsPlaying}
        disabled={ttsBusy}
        sx={{
          justifySelf: "center",
          width: { xs: 44, sm: 48 },
          height: { xs: 44, sm: 48 },
          p: 0,
          borderRadius: "50%",
          bgcolor: activeVoice ? readerChromePurpleActiveBg : "#ffffff",
          border: "none",
          color: readerChromePurple,
          boxShadow: "0 2px 8px rgba(109, 40, 217, 0.18)",
          touchAction: "manipulation",
          WebkitTouchCallout: "none",
          userSelect: "none",
          "&:hover": {
            bgcolor: activeVoice ? "#ddd6fe" : "#ffffff",
            color: readerChromePurpleHover,
          },
        }}
      >
        {ttsBusy ? (
          <CircularProgress size={22} sx={{ color: readerChromePurple }} />
        ) : (
          <SoundWaveIcon levels={waveLevels} sx={{ fontSize: { xs: 26, sm: 28 }, opacity: 1 }} />
        )}
      </IconButton>
      <Box sx={{ display: "flex", flexShrink: 0, alignItems: "center", justifyContent: "flex-end", gap: { xs: 0.25, sm: 0.5 }, minWidth: 0 }}>
        {trailingEnd != null ? <Box sx={{ display: "flex", alignItems: "center" }}>{trailingEnd}</Box> : null}
      </Box>
    </Box>
  );
};