import { CoverShimmerSkeleton } from "../cover/CoverShimmerSkeleton";
import { renderPdfFilePageDataUrl } from "../../utils/pdf/renderPdfFilePageDataUrl";
import { Box, type SxProps, type Theme } from "@mui/material";
import { useEffect, useState } from "react";

type Props = {
  file: File;
  pageWidth?: number;
  sx?: SxProps<Theme>;
  onFailed?: () => void;
};

const ADD_BOOK_THUMB_ASPECT = 56 / 80;

export const AddBookPdfThumbPreview = ({ file, pageWidth = 168, sx, onFailed }: Props) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    void renderPdfFilePageDataUrl(file, pageWidth, ADD_BOOK_THUMB_ASPECT).then((url) => {
      if (cancelled) return;
      if (!url) onFailed?.();
      else setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [file, onFailed, pageWidth]);

  if (!dataUrl)
    return (
      <Box sx={{ width: "100%", height: "100%", overflow: "hidden", bgcolor: "background.paper" }}>
        <CoverShimmerSkeleton />
      </Box>
    );

  return (
    <Box
      component="img"
      src={dataUrl}
      alt=""
      sx={[
        { width: "100%", height: "100%", objectFit: "cover", display: "block", bgcolor: "background.paper" },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
};