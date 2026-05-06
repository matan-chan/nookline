import { passwordStrengthMeterTier } from "../auth/passwordStrength";
import type { SxProps, Theme } from "@mui/material/styles";
import { alpha, useTheme } from "@mui/material/styles";
import { Box, Stack, Typography } from "@mui/material";

const labelFor = (n: 0 | 1 | 2 | 3 | 4) => (["", "Weak", "Fair", "Good", "Strong"] as const)[n];

const tierColor = (th: Theme, n: 0 | 1 | 2 | 3 | 4) => {
  if (n <= 0) return alpha(th.palette.text.secondary, 0.5);
  if (n === 1) return th.palette.mode === "dark" ? "#7fb0c9" : alpha(th.palette.info.main, 0.9);
  if (n === 2) return th.palette.warning.main;
  if (n === 3) return th.palette.info.main;
  return th.palette.success.main;
};

type Props = { value: string; showLabel?: boolean; sx?: SxProps<Theme> };

export const PasswordStrengthMeter = ({ value, showLabel = true, sx }: Props) => {
  const theme = useTheme();
  const n = passwordStrengthMeterTier(value);
  const active = tierColor(theme, n);
  const inactiveBg =
    theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.text.primary, 0.08);

  return (
    <Stack spacing={0.75} sx={{ width: "100%", ...sx }}>
      <Stack direction="row" spacing={0.75} sx={{ width: "100%" }}>
        {([0, 1, 2, 3] as const).map((i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 0.5,
              bgcolor: n > 0 && i < n ? active : inactiveBg,
              transition: "background-color 0.2s ease",
            }}
          />
        ))}
      </Stack>
      {showLabel && value.length > 0 ? (
        <Typography variant="caption" sx={{ color: active, fontWeight: 500 }}>
          {labelFor(n)} password
        </Typography>
      ) : null}
    </Stack>
  );
};
