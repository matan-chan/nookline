import { keyframes, type SxProps, type Theme } from "@mui/material/styles";

const staggerFadeUp = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

const STAGGER_STEP_MS = 40;
const STAGGER_MAX_CHILDREN = 32;

const staggerDelayRows = Object.fromEntries(
  Array.from({ length: STAGGER_MAX_CHILDREN }, (_, i) => [
    `& > *:nth-of-type(${i + 1})`,
    { animationDelay: `${i * STAGGER_STEP_MS}ms` },
  ])
);

export const staggerGridChildrenSx = {
  "& > *": {
    animation: `${staggerFadeUp} 0.45s cubic-bezier(0.4, 0, 0.2, 1) backwards`,
  },
  ...staggerDelayRows,
};

const cardColumnEase = "cubic-bezier(0.4, 0, 0.2, 1)";

export const coverCardColumnHoverSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  transition: `transform 0.22s ${cardColumnEase}`,
  "&:hover": { transform: "translateY(-3px)" },
  "&:hover .cover, &:hover .lib-cover": { transform: "scale(1.02)" },
};
