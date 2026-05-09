import { Box, Stack, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Probe = { ok: boolean; error: string | null } | null | undefined;

export const SettingsTtsCardProbeRow = ({ probe, t }: { probe: Probe; t: TFunction<"settings"> }) => (
  <Stack direction="row" alignItems="flex-start" spacing={1}>
    <Box
      sx={{
        width: 8,
        height: 8,
        mt: 0.5,
        flexShrink: 0,
        borderRadius: "50%",
        bgcolor: probe == null ? "divider" : probe.ok ? "secondary.main" : "error.main",
        animation: probe?.ok ? "pulse 2s infinite" : "none",
        "@keyframes pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
      }}
    />
    <Typography
      variant="caption"
      color={probe != null && !probe.ok ? "error.main" : "text.secondary"}
      sx={{ wordBreak: "break-word", lineHeight: 1.45 }}
    >
      {probe == null ? t("probeChecking") : probe.ok ? t("probeOk") : probe.error?.trim() || t("probeFail")}
    </Typography>
  </Stack>
);
