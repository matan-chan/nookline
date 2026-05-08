import Add from "@mui/icons-material/Add";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"dashboard">;
  greetingKey: string;
  username: string;
  onAddLibrary: () => void;
};

const MobileHeader = ({ t, greetingKey, username, onAddLibrary }: Props) => (
  <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 0.5 }}>
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
      <Typography sx={{ typography: { xs: "h5", sm: "h4" }, fontWeight: 700, flex: 1, minWidth: 0, lineHeight: 1.25, pt: 0.25 }}>
        {t(greetingKey, { username })}
      </Typography>
      <IconButton
        size="small"
        color="inherit"
        onClick={onAddLibrary}
        aria-label={t("addLibrary")}
        sx={{
          flexShrink: 0,
          width: 34,
          height: 34,
          p: 0,
          borderRadius: 1.75,
          background: "linear-gradient(135deg, #ba9eff, #8455ef)",
          color: "#000",
          "&:hover": { background: "linear-gradient(135deg, #c9b0ff, #9469f5)" },
        }}
      >
        <Add sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Newsreader", serif' }}>
      {t("welcomeSubtitle")}
    </Typography>
  </Box>
);

const DesktopHeader = ({ t, greetingKey, username, onAddLibrary }: Props) => (
  <Box sx={{ display: { xs: "none", md: "flex" }, flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
    <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
      <Typography sx={{ typography: { sm: "h3" }, fontWeight: 700, mb: 0.5 }}>
        {t(greetingKey, { username })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Newsreader", serif' }}>
        {t("welcomeSubtitle")}
      </Typography>
    </Box>
    <Button
      variant="outlined"
      onClick={onAddLibrary}
      sx={(th) => ({
        flexShrink: 0,
        borderColor: alpha(th.palette.divider, 0.5),
        color: "secondary.main",
        fontWeight: 500,
        textTransform: "none",
        "&:hover": {
          borderColor: alpha(th.palette.divider, 0.8),
          bgcolor: alpha(th.palette.mode === "light" ? th.palette.common.black : th.palette.common.white, 0.04),
        },
      })}
    >
      {t("addLibrary")}
    </Button>
  </Box>
);

export const DashboardGreetingHeader = (props: Props) => (
  <Box sx={{ mb: { xs: 4, md: 6 } }}>
    <MobileHeader {...props} />
    <DesktopHeader {...props} />
  </Box>
);
