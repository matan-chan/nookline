import { ttsReaderPanelCompactClosePaperSx } from "./ttsReaderPanelStyles";
import CloseIcon from "@mui/icons-material/Close";
import { IconButton, Paper } from "@mui/material";

type TtsReaderPanelCompactCloseProps = {
  onClose: () => void;
  closeLabel: string;
};

export const TtsReaderPanelCompactClose = ({ onClose, closeLabel }: TtsReaderPanelCompactCloseProps) => (
  <Paper elevation={8} sx={(th) => ttsReaderPanelCompactClosePaperSx(th)}>
    <IconButton aria-label={closeLabel} size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
      <CloseIcon fontSize="small" sx={{ fontSize: { xs: ".9rem", sm: "1rem" } }} />
    </IconButton>
  </Paper>
);
