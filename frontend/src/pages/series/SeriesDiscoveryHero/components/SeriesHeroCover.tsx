import { DETAIL_COVER_GLOW } from "../../../detail/detailPurpleAccent";
import { BookCoverImg } from "../../../../components/BookCoverImg";
import { COVER_SIZES_HERO } from "../../../../utils/cover/cover";
import { Box, Typography } from "@mui/material";

type Props = {
  title: string;
  coverUrl: string | null;
};

export const SeriesHeroCover = ({ title, coverUrl }: Props) => (
  <Box
    sx={{
      width: { xs: 240, sm: 280, md: 320 },
      flexShrink: 0,
      borderRadius: 3,
      overflow: "hidden",
      bgcolor: "background.paper",
      boxShadow: DETAIL_COVER_GLOW,
      aspectRatio: "2/3",
    }}
  >
    {coverUrl ? (
      <BookCoverImg
        src={coverUrl}
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
