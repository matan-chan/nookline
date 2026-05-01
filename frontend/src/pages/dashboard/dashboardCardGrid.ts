import { staggerGridChildrenSx } from "../../utils/staggerGridSx";

export const dashboardCardGridSx = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: {
    xs: "repeat(2, 1fr)",
    sm: "repeat(3, 1fr)",
    md: "repeat(4, 1fr)",
    lg: "repeat(6, 1fr)",
  },
  ...staggerGridChildrenSx,
};
