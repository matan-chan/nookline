import { buildCoverSrcSet, COVER_SIZES_GRID, defaultCoverImgSrc, getBookCoverFallbackSrc, isApiCoverUrl } from "../utils/cover/cover";
import { CoverShimmerSkeleton } from "./cover/CoverShimmerSkeleton";
import { BookCoverPdfPage } from "./BookCoverPdfPage";
import { Box, type SxProps, type Theme } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

export type BookCoverImgProps = {
  src: string;
  alt: string;
  bookId?: number;
  fileExt?: "pdf" | "epub" | null;
  pdfPageWidth?: number;
  sizes?: string;
  loading?: "eager" | "lazy";
  sx?: SxProps<Theme>;
  onExhausted?: () => void;
};

export const BookCoverImg = ({
  src,
  alt,
  bookId,
  fileExt,
  pdfPageWidth,
  sizes = COVER_SIZES_GRID,
  loading = "lazy",
  sx,
  onExhausted,
}: BookCoverImgProps) => {
  const [failed, setFailed] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const [imgReady, setImgReady] = useState(false);
  const srcCandidates = useMemo(() => {
    const urls: string[] = [];
    if (src.trim()) urls.push(src.trim());
    if (bookId != null && bookId > 0) {
      const local = getBookCoverFallbackSrc(bookId);
      if (!urls.includes(local)) urls.push(local);
    }
    return urls;
  }, [src, bookId]);
  const activeSrc = srcCandidates[srcIndex] ?? srcCandidates[0] ?? "";
  const srcSet = buildCoverSrcSet(activeSrc);
  const canUsePdf = bookId != null && bookId > 0 && fileExt === "pdf";
  const showPdf = canUsePdf && (!activeSrc || failed);

  useEffect(() => {
    setFailed(false);
    setSrcIndex(0);
    setImgReady(false);
  }, [src, bookId]);

  const advanceOrFail = useCallback(() => {
    if (srcIndex + 1 < srcCandidates.length) {
      setSrcIndex((i) => i + 1);
      setImgReady(false);
      return;
    }
    setFailed(true);
    onExhausted?.();
  }, [onExhausted, srcCandidates.length, srcIndex]);

  if (showPdf)
    return (
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <BookCoverPdfPage
          bookId={bookId}
          pageWidth={pdfPageWidth}
          sx={sx}
          onReady={() => setImgReady(true)}
        />
        {!imgReady ? (
          <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <CoverShimmerSkeleton />
          </Box>
        ) : null}
      </Box>
    );

  if (failed)
    return (
      <Box
        sx={[
          (t) => ({
            width: "100%",
            height: "100%",
            bgcolor: t.surfaces.high,
          }),
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      />
    );

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
      {!imgReady ? (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
          <CoverShimmerSkeleton />
        </Box>
      ) : null}
      <Box
        component="img"
        src={defaultCoverImgSrc(activeSrc)}
        srcSet={srcSet ?? undefined}
        sizes={srcSet && isApiCoverUrl(activeSrc) ? sizes : undefined}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={advanceOrFail}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth < 8 || img.naturalHeight < 8) {
            advanceOrFail();
            return;
          }
          setImgReady(true);
        }}
        sx={[
          { width: "100%", height: "100%", objectFit: "cover", display: "block" },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      />
    </Box>
  );
};