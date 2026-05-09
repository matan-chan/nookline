export const surfacesDark = {
  lowest: "#000000",
  low: "#0b1323",
  container: "#11192b",
  high: "#161f33",
  highest: "#1b263b",
} as const;

export const surfacesLight = {
  lowest: "#E2E8F0",
  low: "#F1F5F9",
  container: "#FFFFFF",
  high: "#F8FAFC",
  highest: "#FFFFFF",
} as const;

export type NooklineSurfaces = {
  lowest: string;
  low: string;
  container: string;
  high: string;
  highest: string;
};
