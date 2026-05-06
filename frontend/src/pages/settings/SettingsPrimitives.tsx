import type { ReactNode } from "react";
import { Box, Paper, Slider, Stack, Typography } from "@mui/material";

type SectionTitleProps = {
  children: ReactNode;
  icon?: ReactNode;
};

export const SectionTitle = ({ children, icon }: SectionTitleProps) => (
  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
    {icon != null ? (
      <Box sx={{ display: "flex", color: "primary.main", "& svg": { fontSize: 26 } }} aria-hidden>
        {icon}
      </Box>
    ) : null}
    <Typography variant="h6" sx={{ fontWeight: 600 }}>
      {children}
    </Typography>
  </Stack>
);

export const SettingsCard = ({ children }: { children: React.ReactNode }) => (
  <Paper elevation={0} sx={(t) => ({ p: 3, borderRadius: 2, bgcolor: t.surfaces.container })}>
    <Stack spacing={2}>{children}</Stack>
  </Paper>
);

export const RangeField = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = (v: number) => `${v}×`,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) => (
  <Stack direction="row" alignItems="center" spacing={2}>
    <Typography variant="body2" color="text.secondary" sx={{ width: 56, flexShrink: 0 }}>
      {label}
    </Typography>
    <Slider
      size="small"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(_, v) => onChange(v as number)}
      sx={{ flex: 1 }}
    />
    <Typography variant="body2" sx={{ width: 44, textAlign: "right", flexShrink: 0 }}>
      {formatValue(value)}
    </Typography>
  </Stack>
);
