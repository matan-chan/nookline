import { alpha } from "@mui/material/styles";

export const fieldLabelProps = {
  sx: { mb: 0.75, display: "block", fontSize: "0.875rem", fontWeight: 600, color: "text.primary" },
} as const;

export const fieldHintSx = { mt: 0.75, display: "block", fontSize: "0.6875rem", lineHeight: 1.45, color: "text.secondary" } as const;

export const providerSelectSx = (th: { surfaces: { high: string }; palette: { common: { white: string } } }) => ({
  borderRadius: 2,
  bgcolor: th.surfaces.high,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: alpha(th.palette.common.white, 0.1) },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha("#ba9eff", 0.35) },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: alpha("#ba9eff", 0.5) },
  "& .MuiSelect-select": { py: 1.5, px: 1.5, display: "flex", alignItems: "center" },
});
