import { Grow, Slide } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import type { ComponentProps } from "react";
import { fontSansFamily } from "./nooklineTypography";

const buttonHoverEase = "cubic-bezier(0.4, 0, 0.2, 1)";
export const menuTransition = { enter: 260, exit: 220 } as const;
const dialogTransition = { enter: 300, exit: 240 } as const;
const drawerTransition = { enter: 320, exit: 280 } as const;

const fontSans = fontSansFamily;

export const buildNooklineComponents = () => ({
  MuiCssBaseline: {
    styleOverrides: {
      html: { minHeight: "100%" },
      body: ({ theme }: { theme: Theme }) => ({
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
      }),
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: "8px",
        fontWeight: 500,
        transition: `transform 0.22s ${buttonHoverEase}, box-shadow 0.22s ${buttonHoverEase}, background-color 0.2s ease`,
        willChange: "transform",
        "&:hover:not(.Mui-disabled)": { transform: "translateY(-2px)" },
        "&:active:not(.Mui-disabled)": { transform: "scale(0.97)", transitionDuration: "0.12s" },
        "@media (prefers-reduced-motion: reduce)": {
          "&:hover:not(.Mui-disabled)": { transform: "none" },
          "&:active:not(.Mui-disabled)": { transform: "none" },
        },
        "&.Mui-disabled": { transform: "none" },
      },
      sizeSmall: { fontSize: "0.8125rem", padding: "6px 12px", borderRadius: "8px" },
      sizeLarge: { borderRadius: "8px" },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: "8px",
        transition: `transform 0.2s ${buttonHoverEase}, background-color 0.2s ease`,
        "&:hover:not(.Mui-disabled)": { transform: "scale(1.08)" },
        "&:active:not(.Mui-disabled)": { transform: "scale(1)", transitionDuration: "0.1s" },
        "&.Mui-disabled": { transform: "none" },
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        borderRadius: "8px",
        textTransform: "none",
        transition: `transform 0.2s ${buttonHoverEase}, background-color 0.2s ease, border-color 0.2s ease`,
        "&:hover:not(.Mui-disabled):not(.Mui-selected)": { transform: "translateY(-1px)" },
        "&:active:not(.Mui-disabled)": { transform: "translateY(0)" },
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      root: { fontFamily: fontSans, fontSize: "0.875rem" },
      input: ({ theme }: { theme: Theme }) => ({ fontFamily: fontSans, color: theme.palette.text.primary }),
    },
  },
  MuiFilledInput: {
    styleOverrides: {
      root: { borderRadius: "8px" },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        borderRadius: "8px",
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.mode === "light" ? alpha(theme.palette.common.black, 0.23) : alpha(theme.palette.common.white, 0.12),
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: alpha(theme.palette.primary.main, 0.35),
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: alpha(theme.palette.primary.main, 0.55),
        },
      }),
      input: ({ theme }: { theme: Theme }) => ({ fontFamily: fontSans, color: theme.palette.text.primary }),
    },
  },
  MuiInputLabel: {
    styleOverrides: { root: { fontFamily: fontSans, fontSize: "0.875rem" } },
  },
  MuiFormLabel: {
    styleOverrides: { root: { fontFamily: fontSans } },
  },
  MuiSelect: {
    styleOverrides: {
      select: ({ theme }: { theme: Theme }) => ({
        fontFamily: fontSans,
        color: theme.palette.text.primary,
        display: "flex",
        alignItems: "center",
      }),
      icon: ({ theme }: { theme: Theme }) => ({ color: theme.palette.text.secondary }),
    },
  },
  MuiMenu: {
    defaultProps: {
      disableScrollLock: true,
      transitionDuration: menuTransition,
      TransitionComponent: Grow,
    },
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        borderRadius: "8px",
        backgroundImage: "none",
        bgcolor: theme.palette.background.paper,
        border: theme.palette.mode === "light" ? `1px solid ${alpha(theme.palette.common.black, 0.08)}` : `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
      }),
    },
  },
  MuiPopover: {
    defaultProps: {
      disableScrollLock: true,
      transitionDuration: menuTransition,
      TransitionComponent: Grow,
    },
    styleOverrides: {
      paper: ({ theme }: { theme: Theme }) => ({
        borderRadius: "8px",
        backgroundImage: "none",
        bgcolor: theme.palette.background.paper,
      }),
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        fontFamily: fontSans,
        fontSize: "0.875rem",
        color: theme.palette.text.primary,
        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) },
        "&.Mui-selected": {
          bgcolor: alpha(theme.palette.primary.main, 0.16),
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.22) },
        },
      }),
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: "8px" },
      label: { fontFamily: fontSans },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: { fontFamily: fontSans, textTransform: "none" as const, fontWeight: 500, borderRadius: "8px", minHeight: 40 },
    },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { backgroundImage: "none" },
    },
  },
  MuiDialog: {
    defaultProps: { transitionDuration: dialogTransition },
    styleOverrides: {
      paper: { backgroundImage: "none", borderRadius: "12px" },
    },
  },
  MuiDrawer: {
    defaultProps: { transitionDuration: drawerTransition },
  },
  MuiSnackbar: {
    defaultProps: {
      TransitionComponent: Slide,
      TransitionProps: { direction: "up" } as Partial<ComponentProps<typeof Slide>>,
    },
  },
});
