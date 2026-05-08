import { Box, type SxProps, type Theme } from "@mui/material";
import { buildCoverSrcSet, COVER_SIZES_GRID, defaultCoverImgSrc } from "../utils/cover/cover";

export type BookCoverImgProps = {
  src: string;
  alt: string;
  sizes?: string;
  loading?: "eager" | "lazy";
  sx?: SxProps<Theme>;
};

export const BookCoverImg = ({ src, alt, sizes = COVER_SIZES_GRID, loading = "lazy", sx }: BookCoverImgProps) => {
  const srcSet = buildCoverSrcSet(src);
  return (
    <Box
      component="img"
      src={defaultCoverImgSrc(src)}
      srcSet={srcSet ?? undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading}
      decoding="async"
      sx={sx}
    />
  );
};
