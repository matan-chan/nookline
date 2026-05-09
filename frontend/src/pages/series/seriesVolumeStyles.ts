export const seriesVolumeRowSx = {
  display: "flex",
  flexDirection: "row" as const,
  flexWrap: "nowrap" as const,
  gap: 2.5,
  overflowX: "auto" as const,
  pt: 2,
  pb: 7,
  WebkitOverflowScrolling: "touch" as const,
  "&::-webkit-scrollbar": { height: 6 },
  "&::-webkit-scrollbar-thumb": {
    borderRadius: 3,
    bgcolor: "rgba(255,255,255,0.12)",
  },
};
