import { CoverShimmerSkeleton } from "../cover/CoverShimmerSkeleton";
import { COVER_WIDTH_PX } from "../../pages/book/bookDetailHeroConstants";
import { Box, Skeleton, Stack } from "@mui/material";

export const BookDetailLoadingSkeleton = () => (
  <Box sx={{ mx: { xs: 1.5, sm: 2.5, md: 4 } }}>
    <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 3, md: 5 }} alignItems={{ xs: "center", md: "stretch" }}>
      <Box
        sx={{
          width: COVER_WIDTH_PX,
          aspectRatio: "2/3",
          borderRadius: 3,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <CoverShimmerSkeleton />
      </Box>
      <Stack sx={{ flex: 1, width: "100%", minWidth: 0 }} spacing={2}>
        <Skeleton variant="text" width="92%" height={48} animation="wave" />
        <Skeleton variant="text" width="40%" height={28} animation="wave" />
        <Skeleton variant="rounded" width={160} height={44} animation="wave" />
        <Skeleton variant="text" width="100%" height={80} animation="wave" />
      </Stack>
    </Stack>
  </Box>
);