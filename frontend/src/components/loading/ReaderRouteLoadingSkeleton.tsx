import { CoverShimmerSkeleton } from "../cover/CoverShimmerSkeleton";
import { Box, Skeleton, Stack } from "@mui/material";

export const ReaderRouteLoadingSkeleton = () => (
  <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column", bgcolor: "background.default" }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Skeleton variant="circular" width={40} height={40} animation="wave" />
      <Skeleton variant="text" width={160} height={28} animation="wave" />
    </Box>
    <Box sx={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", px: 2, py: 4 }}>
      <Stack spacing={2} sx={{ width: "min(100%, 420px)" }}>
        <Box sx={{ aspectRatio: "3/4", maxHeight: "min(52vh, 520px)", borderRadius: 2, overflow: "hidden" }}>
          <CoverShimmerSkeleton />
        </Box>
        <Skeleton variant="text" height={28} width="88%" animation="wave" />
        <Skeleton variant="text" height={20} width="64%" animation="wave" />
      </Stack>
    </Box>
  </Box>
);