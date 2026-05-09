import { Button, Stack } from "@mui/material";
import type { TFunction } from "i18next";
import type { UploadState } from "./addBookModalTypes";

type Props = {
  upload: UploadState;
  isDone: boolean;
  metaReady: boolean;
  titleTrimmed: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  t: TFunction<"addBook">;
  tc: TFunction<"common">;
};

export const AddBookModalActions = ({ upload, isDone, metaReady, titleTrimmed, saving, onClose, onSave, t, tc }: Props) => (
  <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
    <Button fullWidth variant="text" color="inherit" onClick={onClose}>
      {tc("cancel")}
    </Button>
    <Button
      fullWidth
      variant="contained"
      disabled={!isDone || !metaReady || !titleTrimmed || saving}
      onClick={onSave}
      sx={{
        background: "linear-gradient(135deg, #ba9eff, #8455ef)",
        color: "#000",
        fontWeight: 600,
      }}
    >
      {saving ? t("saving") : upload.status === "uploading" ? t("uploadingShort") : isDone && !metaReady ? t("loading") : t("submit")}
    </Button>
  </Stack>
);
