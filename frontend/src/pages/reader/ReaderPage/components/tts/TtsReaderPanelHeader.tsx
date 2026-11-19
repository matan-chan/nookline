import { TTS_READER_PANEL_MOTION_MS } from "./ttsReaderPanelConstants";
import { Box, Collapse, IconButton, Typography } from "@mui/material";
import { StatusDot } from "./TtsReaderPanelParts";
import CloseIcon from "@mui/icons-material/Close";

type TtsReaderPanelHeaderProps = {
  hidden: boolean;
  playing: boolean;
  onClose: () => void;
  showTitle: boolean;
  bookTitle: string | null;
  panelTitle: string;
  closeLabel: string;
};

export const TtsReaderPanelHeader = ({ hidden, playing, onClose, showTitle, bookTitle, panelTitle, closeLabel }: TtsReaderPanelHeaderProps) => (
  <Collapse in={!hidden} timeout={TTS_READER_PANEL_MOTION_MS} collapsedSize={0} easing={{ exit: "easeInOut" as const, enter: "easeInOut" as const }}>
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StatusDot active={playing} />
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: { xs: "0.7rem", sm: undefined } }}>
            {panelTitle}
          </Typography>
        </Box>
        {showTitle && bookTitle ? (
          <Typography variant="caption" sx={{ mt: 0.25, display: "block", fontWeight: 600, fontSize: { xs: "0.68rem", sm: undefined } }} noWrap title={bookTitle}>
            {bookTitle}
          </Typography>
        ) : null}
      </Box>
      <IconButton aria-label={closeLabel} size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  </Collapse>
);
