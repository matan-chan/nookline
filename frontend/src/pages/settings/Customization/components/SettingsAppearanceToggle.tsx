import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"settings">;
  mode: string;
  onChangeMode: (next: string) => void;
};

export const SettingsAppearanceToggle = ({ t, mode, onChangeMode }: Props) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "stretch", sm: "center" },
      justifyContent: "flex-start",
      gap: { xs: 1.5, sm: 2.5 },
    }}
  >
    <Box sx={{ flexShrink: 0, minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {t("sectionAppearance")}
      </Typography>
    </Box>
    <ToggleButtonGroup
      exclusive
      value={mode}
      onChange={(_, v) => v && onChangeMode(v)}
      sx={(th) => ({
        alignSelf: { xs: "stretch", sm: "flex-start" },
        flexShrink: 0,
        width: { xs: "100%", sm: "auto" },
        minWidth: { xs: "100%", sm: 220 },
        bgcolor: th.palette.mode === "dark" ? th.palette.common.black : alpha(th.palette.grey[500], 0.18),
        borderRadius: 9999,
        p: 0.5,
        gap: 0.5,
        "& .MuiToggleButtonGroup-grouped": {
          margin: 0,
          border: "none",
          borderRadius: `${Math.max(12, Number(th.shape.borderRadius) * 3)}px !important`,
          px: 2,
          py: 1,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          color: th.palette.mode === "dark" ? alpha(th.palette.grey[400], 0.95) : alpha(th.palette.text.secondary, 0.95),
          bgcolor: "transparent",
          "&.Mui-selected": {
            bgcolor: th.palette.mode === "dark" ? th.surfaces.high : th.palette.common.white,
            color: th.palette.mode === "dark" ? th.palette.primary.light : th.palette.primary.main,
            boxShadow: th.palette.mode === "light" ? `0 1px 2px ${alpha(th.palette.common.black, 0.06)}` : "none",
            "&:hover": {
              bgcolor: th.palette.mode === "dark" ? alpha(th.surfaces.high, 0.92) : alpha(th.palette.common.white, 0.94),
            },
          },
          "&:hover": {
            bgcolor: alpha(th.palette.mode === "dark" ? th.palette.common.white : th.palette.common.black, 0.06),
          },
        },
      })}
    >
      <ToggleButton value="light" disableRipple aria-label={t("themeLight")}>
        <LightModeOutlined sx={{ fontSize: 20 }} />
        {t("themeLight")}
      </ToggleButton>
      <ToggleButton value="dark" disableRipple aria-label={t("themeInky")}>
        <DarkModeOutlined sx={{ fontSize: 20 }} />
        {t("themeInky")}
      </ToggleButton>
    </ToggleButtonGroup>
  </Box>
);
