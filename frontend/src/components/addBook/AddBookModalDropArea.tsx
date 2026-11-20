import {
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import type { TFunction } from "i18next";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { truncateMiddle } from "../../utils/text/truncateMiddle";
import type { UploadState } from "./addBookModalTypes";

type Props = {
  upload: UploadState;
  setUpload: Dispatch<SetStateAction<UploadState>>;
  inputRef: RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onReset: () => void;
  t: TFunction<"addBook">;
};

const dropBorder = (upload: UploadState) => {
  if (upload.status === "dragging")
    return (th: Theme) => `2px dashed ${alpha(th.palette.primary.main, 0.6)}`;
  if (upload.status === "done") return (th: Theme) => `2px dashed ${alpha(th.palette.secondary.main, 0.5)}`;
  if (upload.status === "error") return (th: Theme) => `2px dashed ${alpha(th.palette.error.main, 0.5)}`;
  return (th: Theme) => `2px dashed ${alpha(th.palette.divider, 0.6)}`;
};

const dropBg = (upload: UploadState): string | ((th: Theme) => string) => {
  if (upload.status === "dragging") return (th: Theme) => alpha(th.palette.primary.main, 0.06);
  if (upload.status === "done") return (th: Theme) => alpha(th.palette.secondary.main, 0.06);
  if (upload.status === "error") return (th: Theme) => alpha(th.palette.error.main, 0.06);
  return "transparent";
};

export const AddBookModalDropArea = ({ upload, setUpload, inputRef, onFileChange, onDrop, onReset, t }: Props) => {
  const borderFn = dropBorder(upload);
  const bgVal = dropBg(upload);
  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        setUpload((s) => (s.status === "uploading" || s.status === "done" ? s : { status: "dragging" }));
      }}
      onDragLeave={() => setUpload((s) => (s.status === "dragging" ? { status: "idle" } : s))}
      onDrop={onDrop}
      onClick={() => upload.status !== "uploading" && inputRef.current?.click()}
      sx={(th) => ({
        position: "relative",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        borderRadius: 2,
        border: borderFn(th),
        bgcolor: typeof bgVal === "function" ? bgVal(th) : bgVal,
        cursor: upload.status === "uploading" ? "default" : "pointer",
        userSelect: "none",
        transition: "border-color 0.2s, background-color 0.2s",
        "&:hover":
          upload.status === "idle" || upload.status === "dragging"
            ? {
                borderColor: alpha(th.palette.primary.main, 0.5),
                bgcolor: th.surfaces.high,
              }
            : {},
      })}
    >
      <input ref={inputRef} type="file" accept=".epub,.pdf" hidden onChange={onFileChange} />

      {(upload.status === "idle" || upload.status === "dragging") && (
        <>
          {upload.status === "dragging" ? (
            <FileDownloadOutlined sx={{ fontSize: 32, color: "primary.main" }} />
          ) : (
            <UploadFileOutlined sx={{ fontSize: 32, color: "text.secondary" }} />
          )}
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2">{upload.status === "dragging" ? t("dropHere") : t("dropPrompt")}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {t("fileTypesHint")}
            </Typography>
          </Box>
        </>
      )}

      {upload.status === "uploading" && (
        <Stack sx={{ width: "100%", px: 3, alignItems: "center", gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t("uploading", { percent: upload.progress })}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={upload.progress}
            sx={{ width: "100%", height: 6, borderRadius: 9999, bgcolor: (th) => th.surfaces.highest }}
          />
        </Stack>
      )}

      {upload.status === "done" && (
        <Stack alignItems="center" sx={{ px: 2, gap: 0.5, width: "100%", minWidth: 0 }}>
          <Typography sx={{ color: "secondary.main", fontSize: "1.25rem" }}>✓</Typography>
          <Typography variant="caption" color="text.secondary" title={upload.filename} sx={{ maxWidth: "100%", textAlign: "center" }}>
            {truncateMiddle(upload.filename, 56)}
          </Typography>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            sx={{ textTransform: "none", fontSize: "0.75rem" }}
          >
            {t("replaceFile")}
          </Button>
        </Stack>
      )}

      {upload.status === "error" && (
        <Stack alignItems="center" sx={{ px: 2, gap: 0.5 }}>
          <Typography sx={{ color: "error.main", fontSize: "1.25rem" }}>⚠</Typography>
          <Typography variant="caption" color="error" textAlign="center">
            {upload.message}
          </Typography>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            sx={{ textTransform: "none", fontSize: "0.75rem" }}
          >
            {t("tryAgain")}
          </Button>
        </Stack>
      )}
    </Box>
  );
};
