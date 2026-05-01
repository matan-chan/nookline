import { passwordScore } from "../auth/passwordStrength";
import { LinearProgress, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

const labelFor = (n: 0 | 1 | 2 | 3 | 4) => (["", "Weak", "Fair", "Good", "Strong"] as const)[n];

type Props = { value: string; showLabel?: boolean };

export const PasswordStrengthMeter = ({ value, showLabel = true }: Props) => {
  const theme = useTheme();
  const n = passwordScore(value);
  const p = n === 0 ? 0 : (n / 4) * 100;
  const color =
    n <= 1 ? theme.palette.error.main : n === 2 ? theme.palette.warning.main : n === 3 ? theme.palette.info.main : theme.palette.success.main;
  return (
    <Stack spacing={0.5} sx={{ width: "100%" }}>
      <LinearProgress
        variant="determinate"
        value={p}
        sx={{
          height: 6,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.text.primary, 0.08),
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 1 },
        }}
      />
      {showLabel && value.length > 0 ? (
        <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.7) }}>
          {labelFor(n)} password
        </Typography>
      ) : null}
    </Stack>
  );
};
