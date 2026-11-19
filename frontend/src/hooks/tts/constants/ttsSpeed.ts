export const TTS_SPEED_MIN = 0.5;
export const TTS_SPEED_MAX = 2;
export const TTS_SPEED_STEP = 0.05;

export const clampTtsSpeed = (n: number) => {
  const clamped = Math.min(TTS_SPEED_MAX, Math.max(TTS_SPEED_MIN, n));
  return Math.round(clamped * 100) / 100;
};

export const formatTtsSpeedLabel = (n: number) => {
  const s = clampTtsSpeed(n);
  if (Number.isInteger(s)) return String(s);
  return s.toFixed(2).replace(/0$/, "");
};