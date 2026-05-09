import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

export const navItemButtonSx = (theme: Theme, expanded: boolean) => ({
  py: 1.25,
  px: expanded ? 2 : 0,
  minHeight: 44,
  boxSizing: "border-box" as const,
  borderRadius: "8px",
  position: "relative" as const,
  flexGrow: 0,
  flexShrink: 0,
  alignItems: "center",
  justifyContent: expanded ? "flex-start" : "center",
  mx: expanded ? 1 : 0.75,
  color: "text.secondary",
  "&.active": expanded
    ? {
        color: "text.primary",
        bgcolor: "transparent",
        fontWeight: 500,
        "&::before": {
          content: '""',
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "secondary.main",
        },
      }
    : {
        color: theme.palette.mode === "light" ? theme.palette.text.primary : theme.palette.background.default,
        bgcolor: theme.palette.mode === "light" ? theme.palette.background.paper : theme.palette.common.white,
        fontWeight: 500,
      },
  "&:hover": {
    bgcolor:
      theme.palette.mode === "light"
        ? expanded
          ? alpha(theme.palette.common.black, 0.04)
          : alpha(theme.palette.common.black, 0.06)
        : expanded
          ? alpha(theme.palette.common.white, 0.08)
          : alpha(theme.palette.common.white, 0.1),
  },
  "&.active:hover": expanded
    ? {
        bgcolor:
          theme.palette.mode === "light"
            ? alpha(theme.palette.common.black, 0.05)
            : alpha(theme.palette.common.white, 0.06),
      }
    : theme.palette.mode === "light"
      ? { bgcolor: alpha(theme.palette.primary.main, 0.14) }
      : { bgcolor: alpha(theme.palette.common.white, 0.92) },
});
