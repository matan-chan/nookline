import type { ReactNode } from "react";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";

const StatusDot = ({ active }: { active: boolean }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      bgcolor: active ? "secondary.main" : "divider",
      animation: active ? "pulse 2s infinite" : "none",
      "@keyframes pulse": {
        "0%, 100%": { opacity: 1 },
        "50%": { opacity: 0.5 },
      },
    }}
  />
);

export const ReaderBottomBar = ({
  backHref,
  center,
  trailingBeforeAi,
  aiOpen,
  onAiToggle,
}: {
  backHref: string;
  center?: ReactNode;
  trailingBeforeAi?: ReactNode;
  aiOpen: boolean;
  onAiToggle: () => void;
}) => {
  const { t } = useTranslation("reader");
  return (
  <Box
    sx={(t) => ({
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1,
      borderTop: `1px solid ${alpha(t.palette.divider, 0.35)}`,
      bgcolor: t.surfaces.low,
      px: { xs: 1.5, sm: 2 },
      py: 1.5,
    })}
  >
    <Button
      component={Link}
      to={backHref}
      size="small"
      color="inherit"
      aria-label={t("back")}
      startIcon={<ArrowBack fontSize="small" />}
      sx={{
        flexShrink: 0,
        textTransform: "none",
        color: "text.secondary",
        "&:hover": { color: "text.primary" },
        minWidth: { xs: 40, sm: "auto" },
        px: { xs: 0.75, sm: 1.5 },
        "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.5 }, ml: { xs: 0, sm: -0.25 } },
      }}
    >
      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
        {t("back")}
      </Box>
    </Button>
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", overflowX: "auto", px: 0.5 }}>{center}</Box>
    <Box sx={{ display: "flex", flexShrink: 0, alignItems: "center", gap: { xs: 0.25, sm: 0.5 } }}>
      <Button
        type="button"
        size="small"
        onClick={onAiToggle}
        aria-label={t("aiReader")}
        sx={(th) => ({
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: { xs: 0, sm: 0.75 },
          borderRadius: { xs: 2, sm: "8px" },
          textTransform: "none",
          fontSize: "0.75rem",
          minWidth: { xs: 40, sm: "auto" },
          width: { xs: 40, sm: "auto" },
          height: { xs: 40, sm: "auto" },
          px: { xs: 0, sm: 1 },
          py: { xs: 0, sm: undefined },
          ...(aiOpen
            ? { bgcolor: alpha(th.palette.primary.main, 0.2), color: "primary.main" }
            : {
                color: "text.secondary",
                "&:hover": {
                  bgcolor: alpha(th.palette.mode === "light" ? th.palette.common.black : th.palette.common.white, 0.06),
                },
              }),
        })}
      >
        <StatusDot active={aiOpen} />
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          {t("aiReader")}
        </Box>
      </Button>
      {trailingBeforeAi != null ? (
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{trailingBeforeAi}</Box>
      ) : null}
    </Box>
  </Box>
  );
};
