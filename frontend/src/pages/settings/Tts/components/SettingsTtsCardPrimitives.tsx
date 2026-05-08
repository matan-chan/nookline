import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { Box, FormLabel, IconButton, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { fieldLabelProps } from "./settingsTtsCardFieldStyles";

export const ChunkFieldLabel = ({ label, info }: { label: string; info: string }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mb: 0.75 }}>
    <FormLabel sx={{ ...fieldLabelProps.sx, mb: 0 }}>{label}</FormLabel>
    <Tooltip title={info} arrow placement="top">
      <IconButton size="small" aria-label={info} sx={{ p: 0.25, color: "text.secondary" }}>
        <InfoOutlined sx={{ fontSize: 16 }} aria-hidden />
      </IconButton>
    </Tooltip>
  </Box>
);

export const ProviderMenuRow = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, width: "100%", textAlign: "left" }}>
    <Box sx={{ mt: 0.25, color: "primary.main", flexShrink: 0, display: "flex" }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" fontWeight={600} color="text.primary">
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
        {description}
      </Typography>
    </Box>
  </Box>
);
