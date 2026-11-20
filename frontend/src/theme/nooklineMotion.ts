export const nooklineMotion = {
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  durationEnterMs: 220,
  durationExitMs: 180,
  cardHoverMs: 200,
  staggerStepMs: 30,
  staggerMaxChildren: 12,
  activePressScale: 0.97,
} as const;

export const reducedMotionMedia = "@media (prefers-reduced-motion: reduce)";

export const motionSafeTransition = (props: string, durationMs: number) => ({
  transition: `${props} ${durationMs}ms ${nooklineMotion.easeOut}`,
  [reducedMotionMedia]: { transition: "none" },
});