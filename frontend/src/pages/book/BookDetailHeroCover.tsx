import { DETAIL_COVER_GLOW } from "../detail/detailPurpleAccent";
import { BookCoverImg } from "../../components/BookCoverImg";
import { COVER_SIZES_HERO, getFileExt } from "../../utils/cover/cover";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { COVER_WIDTH_PX } from "./bookDetailHeroConstants";

type Props = {
  title: string;
  coverUrl: string | null;
  bookId: number;
  coverImagePath: string | null;
  metadata: string | null;
  fileExt?: string | null;
  filePath?: string | null;
};

export const BookDetailHeroCover = ({ title, coverUrl, bookId, coverImagePath, metadata, fileExt: fileExtProp, filePath }: Props) => {
  const theme = useTheme();
  const pdfPageWidth = useMediaQuery(theme.breakpoints.up("md"))
    ? COVER_WIDTH_PX.md
    : useMediaQuery(theme.breakpoints.up("sm"))
      ? COVER_WIDTH_PX.sm
      : COVER_WIDTH_PX.xs;
  const fileExt = getFileExt({ id: bookId, coverImagePath, metadata, fileExt: fileExtProp, filePath });
  return (
  <Box
    sx={{
      width: COVER_WIDTH_PX,
      alignSelf: { xs: "center", md: "flex-start" },
      flexShrink: 0,
      borderRadius: 3,
      overflow: "hidden",
      bgcolor: "background.paper",
      boxShadow: DETAIL_COVER_GLOW,
      aspectRatio: "2/3",
    }}
  >
    {coverUrl || fileExt === "pdf" ? (
      <BookCoverImg
        bookId={bookId}
        fileExt={fileExt}
        pdfPageWidth={pdfPageWidth}
        src={coverUrl ?? ""}
        alt={title}
        sizes={COVER_SIZES_HERO}
        loading="eager"
        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    ) : (
      <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", px: 1.5 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {title}
        </Typography>
      </Box>
    )}
  </Box>
  );
};
