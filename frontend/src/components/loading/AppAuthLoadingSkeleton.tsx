import { CoverGridLoadingSkeleton } from "./CoverGridLoadingSkeleton";
import { Box, Skeleton, Stack } from "@mui/material";

const RAIL_PLACEHOLDERS = 6;

export const AppAuthLoadingSkeleton = () => (
  <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
        width: 72,
        flexShrink: 0,
        py: 2,
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Skeleton variant="circular" width={40} height={40} animation="wave" />
      {Array.from({ length: RAIL_PLACEHOLDERS }, (_, i) => (
        <Skeleton key={i} variant="rounded" width={44} height={44} animation="wave" />
      ))}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Skeleton variant="text" width={220} height={36} animation="wave" />
        <Skeleton variant="rounded" width="100%" height={120} animation="wave" sx={{ maxWidth: 640 }} />
        <CoverGridLoadingSkeleton />
      </Stack>
    </Box>
  </Box>
);