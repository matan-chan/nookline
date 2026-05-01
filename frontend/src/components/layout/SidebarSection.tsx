import { Typography } from "@mui/material";

export const SidebarSection = ({ label, expanded }: { label: string; expanded: boolean }) =>
  expanded ? (
    <Typography
      variant="caption"
      sx={{
        px: 2,
        pt: 2,
        pb: 0.5,
        display: "block",
        color: "text.secondary",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontSize: "0.625rem",
      }}
    >
      {label}
    </Typography>
  ) : null;
