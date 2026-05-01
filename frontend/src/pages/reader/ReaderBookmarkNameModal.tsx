import { sanitizeLettersDigitsAndWhitespace } from "../../utils/sanitizeUserInput";
import Modal from "../../components/Modal";
import { Box, Button, TextField } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  open: boolean;
  bookmarkNameDraft: string;
  setBookmarkNameDraft: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  t: TFunction<"reader">;
};

export const ReaderBookmarkNameModal = ({ open, bookmarkNameDraft, setBookmarkNameDraft, onClose, onSave, t }: Props) => (
  <Modal open={open} onClose={onClose} title={t("bookmarkModalTitle")}>
    <TextField
      label={t("bookmarkNameLabel")}
      value={bookmarkNameDraft}
      onChange={(e) => setBookmarkNameDraft(sanitizeLettersDigitsAndWhitespace(e.target.value))}
      fullWidth
      autoFocus
      size="small"
      sx={{ mb: 2 }}
    />
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
      <Button onClick={onClose} sx={{ textTransform: "none" }}>
        {t("bookmarkCancel")}
      </Button>
      <Button variant="contained" onClick={() => void onSave()} sx={{ textTransform: "none", color: "#000" }}>
        {t("bookmarkSave")}
      </Button>
    </Box>
  </Modal>
);
