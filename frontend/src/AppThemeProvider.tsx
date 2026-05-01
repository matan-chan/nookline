import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createNooklineTheme } from "./theme";

const STORAGE_KEY = "nookline-color-mode";

export type NooklineColorMode = "light" | "dark";

type ThemeModeContextValue = {
  mode: NooklineColorMode;
  setMode: (m: NooklineColorMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const readStoredMode = (): NooklineColorMode => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
};

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<NooklineColorMode>(() =>
    typeof window !== "undefined" ? readStoredMode() : "dark",
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const setMode = useCallback((m: NooklineColorMode) => setModeState(m), []);

  const theme = useMemo(() => createNooklineTheme(mode), [mode]);
  const ctx = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={(t) => ({
            "*": { boxSizing: "border-box" },
            "::-webkit-scrollbar": { width: 6 },
            "::-webkit-scrollbar-track": { background: t.surfaces.low },
            "::-webkit-scrollbar-thumb": {
              background: t.palette.divider,
              borderRadius: 9999,
            },
            "::-webkit-scrollbar-thumb:hover": {
              background: t.palette.text.secondary,
            },
          })}
        />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useNooklineColorMode = () => {
  const c = useContext(ThemeModeContext);
  if (!c) throw new Error("useNooklineColorMode must be used within AppThemeProvider");
  return c;
};
