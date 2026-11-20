import { Skeleton, type SxProps, type Theme } from "@mui/material";

type Props = { sx?: SxProps<Theme>; "aria-label"?: string };

export const CoverShimmerSkeleton = ({ sx, "aria-label": ariaLabel = "Loading cover" }: Props) => (
  <Skeleton
    variant="rectangular"
    animation="wave"
    aria-label={ariaLabel}
    sx={[
      { width: "100%", height: "100%", transform: "none", borderRadius: 0 },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  />
);