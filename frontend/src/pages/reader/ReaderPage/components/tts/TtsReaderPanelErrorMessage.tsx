import { Box, Typography } from "@mui/material";

type TtsReaderPanelErrorMessageProps = {
  message: string;
  footer: string;
};

export const TtsReaderPanelErrorMessage = ({ message, footer }: TtsReaderPanelErrorMessageProps) => (
  <Box>
    <Typography variant="caption" color="error" sx={{ whiteSpace: "pre-line", wordBreak: "break-word", display: "block" }}>
      {message}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, lineHeight: 1.45 }}>
      {footer}
    </Typography>
  </Box>
);
