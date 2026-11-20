import { CoverShimmerSkeleton } from "../cover/CoverShimmerSkeleton";
import { libraryCardGridSx } from "../../pages/library/LibraryCoverCard";
import { Box, Skeleton } from "@mui/material";

const PLACEHOLDER_COUNT = 8;

export const CoverGridLoadingSkeleton = () => (
  <Box sx={libraryCardGridSx}>
    {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
      <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ position: "relative", aspectRatio: "2/3", borderRadius: 2, overflow: "hidden" }}>
          <CoverShimmerSkeleton />
        </Box>
        <Skeleton variant="text" width="78%" height={20} animation="wave" />
      </Box>
    ))}
  </Box>
);