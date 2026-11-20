import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import { optimizedCoverSrc } from "../../utils/cover/cover";
import { getStoredToken } from "../../auth/authStorage";
import { AddBookUploadPreviewImg } from "./AddBookUploadPreviewImg";
import { AddBookPdfThumbPreview } from "./AddBookPdfThumbPreview";
import { BookCoverImg } from "../BookCoverImg";
import { Box, CircularProgress } from "@mui/material";
import { useState } from "react";
import type { MetaState, UploadState } from "./addBookModalTypes";

type Props = {
  upload: Extract<UploadState, { status: "done" }>;
  meta: MetaState;
  libraryId: number;
};

const uploadPreviewSrc = (libraryId: number, absPath: string) => {
  const tok = getStoredToken();
  const u = new URL("/api/files/upload-preview", window.location.origin);
  u.searchParams.set("libraryId", String(libraryId));
  u.searchParams.set("path", absPath);
  u.searchParams.set("w", "160");
  if (tok) u.searchParams.set("token", tok);
  return u.pathname + u.search;
};

export const AddBookModalCoverThumb = ({ upload, meta, libraryId }: Props) => {
  const [localPdfFailed, setLocalPdfFailed] = useState(false);
  const [serverPdfFailed, setServerPdfFailed] = useState(false);
  const [olCoverFailed, setOlCoverFailed] = useState(false);

  const olCover = meta.status === "found" ? meta.data.coverUrl : null;
  const useLocalPdf = upload.fileExt === "pdf" && upload.localPreviewPdf && !localPdfFailed;
  const useServerPdf = upload.fileExt === "pdf" && upload.path && !serverPdfFailed && (!upload.localPreviewPdf || localPdfFailed);
  const useOlCover = olCover && !olCoverFailed && upload.fileExt !== "pdf";
  const useOlCoverPdfFallback = upload.fileExt === "pdf" && olCover && !olCoverFailed && localPdfFailed && (serverPdfFailed || !upload.path);

  if (useLocalPdf)
    return <AddBookPdfThumbPreview file={upload.localPreviewPdf!} onFailed={() => setLocalPdfFailed(true)} />;

  if (useServerPdf)
    return (
      <AddBookUploadPreviewImg
        src={uploadPreviewSrc(libraryId, upload.path)}
        onFailed={() => setServerPdfFailed(true)}
      />
    );

  if (useOlCover || useOlCoverPdfFallback)
    return (
      <BookCoverImg
        src={optimizedCoverSrc(olCover!) ?? olCover!}
        alt=""
        sizes="56px"
        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        onExhausted={() => setOlCoverFailed(true)}
      />
    );

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {meta.status === "searching" ? (
        <CircularProgress size={18} thickness={4} />
      ) : (
        <PictureAsPdfOutlined sx={{ fontSize: 28, color: "text.secondary", opacity: 0.7 }} />
      )}
    </Box>
  );
};