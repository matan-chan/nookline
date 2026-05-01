import { buildNooklineComponents } from "./theme/nooklineComponents";
import { surfacesDark, surfacesLight, type NooklineSurfaces } from "./theme/nooklineSurfaces";
import { nooklineSharedTypography } from "./theme/nooklineTypography";
import { createTheme, alpha, type PaletteMode } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    surfaces: NooklineSurfaces;
  }
  interface ThemeOptions {
    surfaces?: NooklineSurfaces;
  }
}

const buildPalette = (mode: PaletteMode) =>
  mode === "light"
    ? {
        mode: "light" as const,
        primary: { main: "#7C3AED", contrastText: "#FFFFFF" },
        secondary: { main: "#0EA5E9", contrastText: "#FFFFFF" },
        error: { main: "#EF4444", contrastText: "#FFFFFF" },
        background: { default: "#F8FAFC", paper: "#FFFFFF" },
        divider: alpha("#CBD5E1", 0.85),
        text: { primary: "#0f172a", secondary: "#334155" },
      }
    : {
        mode: "dark" as const,
        primary: { main: "#ba9eff", contrastText: "#000000" },
        secondary: { main: "#34b5fa" },
        error: { main: "#ff6e84", contrastText: "#000000" },
        background: { default: "#070e1d", paper: "#11192b" },
        divider: alpha("#6e7588", 0.2),
        text: { primary: "#dfe5fa", secondary: "#a4abbf" },
      };

export const createNooklineTheme = (mode: PaletteMode) => {
  const surfaces = mode === "light" ? surfacesLight : surfacesDark;
  return createTheme({
    palette: buildPalette(mode),
    shape: { borderRadius: 6 },
    typography: nooklineSharedTypography,
    components: buildNooklineComponents(),
    surfaces,
  });
};

export const nooklineDarkTheme = createNooklineTheme("dark");
export const nooklineLightTheme = createNooklineTheme("light");
export const nooklineTheme = nooklineDarkTheme;
export const surfaces = surfacesDark;
