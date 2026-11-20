import { sanitizeLettersDigitsAndWhitespace } from "../../utils/input/sanitizeUserInput";
import { AddBookModalCoverThumb } from "./AddBookModalCoverThumb";
import { Box, Stack, TextField, Typography } from "@mui/material";
import type { TFunction } from "i18next";
import { truncateMiddle } from "../../utils/text/truncateMiddle";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { MetaState, UploadState } from "./addBookModalTypes";

type Props = {
  upload: Extract<UploadState, { status: "done" }>;
  meta: MetaState;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  t: TFunction<"addBook">;
  libraryId: number;
};

export const AddBookModalTitleMeta = ({ upload, meta, title, setTitle, t, libraryId }: Props) => {
  const [titleFocused, setTitleFocused] = useState(false);

  return (
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
      <AddBookModalCoverThumb key={upload.path} upload={upload} meta={meta} libraryId={libraryId} />
    </Box>

    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <TextField
        autoFocus
        size="small"
        fullWidth
        placeholder={t("titlePlaceholder")}
        value={titleFocused || title.length <= 64 ? title : truncateMiddle(title, 64)}
        onChange={(e) => setTitle(sanitizeLettersDigitsAndWhitespace(e.target.value))}
        onFocus={() => setTitleFocused(true)}
        onBlur={() => setTitleFocused(false)}
        slotProps={{
          htmlInput: {
            title,
            sx: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
        }}
        sx={{
          "& .MuiInputBase-root": { minWidth: 0 },
        }}
      />
      {meta.status === "searching" && (
        <Typography variant="caption" color="text.secondary">
          {t("searchingOl")}
        </Typography>
      )}
      {meta.status === "found" && (
        <Typography
          variant="caption"
          color="text.secondary"
          title={[meta.data.author, meta.data.year, meta.data.genre].filter(Boolean).join(" · ")}
          noWrap
          sx={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}
        >
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
};
