import { getStoredToken } from "../../auth/authStorage";
import { sanitizeLettersDigitsAndWhitespace } from "../../utils/sanitizeUserInput";
import { BookCoverImg } from "../BookCoverImg";
import { optimizedCoverSrc } from "../../utils/cover";
import { Box, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import type { TFunction } from "i18next";
import type { Dispatch, SetStateAction } from "react";
import type { MetaState, UploadState } from "./addBookModalTypes";

type Props = {
  upload: Extract<UploadState, { status: "done" }>;
  meta: MetaState;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  t: TFunction<"addBook">;
  libraryId: number;
};

const uploadPreviewSrc = (libraryId: number, absPath: string) => {
  const tok = getStoredToken();
  const u = new URL("/api/files/upload-preview", window.location.origin);
  u.searchParams.set("libraryId", String(libraryId));
  u.searchParams.set("path", absPath);
  if (tok) u.searchParams.set("token", tok);
  return u.pathname + u.search;
};

export const AddBookModalTitleMeta = ({ upload, meta, title, setTitle, t, libraryId }: Props) => (
  <Stack direction="row" spacing={1.5}>
    <Box
      sx={{
        width: 56,
        height: 80,
        flexShrink: 0,
        borderRadius: 1,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      {meta.status === "found" && meta.data.coverUrl ? (
        <BookCoverImg
          src={optimizedCoverSrc(meta.data.coverUrl) ?? meta.data.coverUrl}
          alt=""
          sizes="56px"
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : upload.fileExt === "pdf" && upload.path ? (
        <BookCoverImg src={uploadPreviewSrc(libraryId, upload.path)} alt="" sizes="56px" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {meta.status === "searching" ? (
            <CircularProgress size={18} thickness={4} />
          ) : (
            <Typography color="text.secondary">📄</Typography>
          )}
        </Box>
      )}
    </Box>

    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <TextField
        autoFocus
        size="small"
        fullWidth
        placeholder={t("titlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(sanitizeLettersDigitsAndWhitespace(e.target.value))}
      />
      {meta.status === "searching" && (
        <Typography variant="caption" color="text.secondary">
          {t("searchingOl")}
        </Typography>
      )}
      {meta.status === "found" && (
        <Typography variant="caption" color="text.secondary">
          {meta.data.author && <span>{t("lineAuthor", { author: meta.data.author })}</span>}
          {meta.data.year && <span>{t("lineYear", { year: meta.data.year })}</span>}
          {meta.data.genre && <span>{t("lineGenre", { genre: meta.data.genre })}</span>}
        </Typography>
      )}
      {meta.status === "found" && meta.data.seriesName && (
        <Typography variant="caption" color="secondary.main" sx={{ mt: 0.5 }}>
          {meta.data.seriesVolume != null
            ? t("seriesWithVolume", { name: meta.data.seriesName, volume: meta.data.seriesVolume })
            : t("seriesNameOnly", { name: meta.data.seriesName })}
        </Typography>
      )}
      {meta.status === "not_found" && upload.fileExt === "pdf" && (
        <Typography variant="caption" color="text.secondary">
          {upload.embeddedTitle ? t("pdfNoMatchEmbedded") : t("pdfNoMatchNoEmbedded")}
        </Typography>
      )}
      {meta.status === "not_found" && upload.fileExt === "epub" && (
        <Typography variant="caption" color="text.secondary">
          {t("epubNoMeta")}
        </Typography>
      )}
    </Stack>
  </Stack>
);
