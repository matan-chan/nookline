import { useAvatarObjectUrl } from "../../hooks/useAvatarObjectUrl";
import { useAuth } from "../../auth/AuthContext";
import { Avatar, Box, ButtonBase, Divider, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type Props = {
  expanded: boolean;
  t: TFunction<"layout">;
  onNavigate?: () => void;
};

export const LayoutSidebarFooter = ({ expanded, t, onNavigate }: Props) => {
  const { user } = useAuth();
  const { t: tr } = useTranslation("auth");
  const label = user?.username ?? t("userName");
  const role = user == null ? "" : user.isAdmin ? tr("userRoleAdmin") : tr("userRoleMember");
  const avatarUrl = useAvatarObjectUrl(user?.hasAvatar);
  const initial = (user?.username ?? "U").trim().charAt(0).toUpperCase() || "U";

  const content = (
    <>
      <Avatar
        src={avatarUrl ?? undefined}
        alt=""
        sx={(th) => ({
          width: 32,
          height: 32,
          bgcolor: alpha(th.palette.primary.main, 0.2),
          color: "primary.main",
          fontSize: "0.75rem",
          fontWeight: 600,
          flexShrink: 0,
        })}
      >
        {initial}
      </Avatar>
      {expanded ? (
        <Box sx={{ minWidth: 0, textAlign: "left" }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }} noWrap title={label}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {role}
          </Typography>
        </Box>
      ) : null}
    </>
  );

  const versionLabel = expanded ? tr("appVersion", { version: __APP_VERSION__ }) : `v${__APP_VERSION__}`;

  const panel =
    user == null ? (
      <Box sx={{ px: expanded ? 2 : 1, py: 2, display: "flex", justifyContent: expanded ? "flex-start" : "center", flexShrink: 0 }}>{content}</Box>
    ) : (
      <ButtonBase
        component={Link}
        to="/profile"
        onClick={() => onNavigate?.()}
        sx={{
          px: expanded ? 2 : 1,
          py: 2,
          display: "flex",
          justifyContent: expanded ? "flex-start" : "center",
          alignItems: "center",
          flexShrink: 0,
          width: "100%",
          gap: expanded ? 1.5 : 0,
          textAlign: "left",
          color: "inherit",
          textDecoration: "none",
          borderRadius: 1,
          transition: (th) => th.transitions.create("background-color", { duration: th.transitions.duration.shortest }),
          "&:hover": { bgcolor: (th) => alpha(th.palette.text.primary, 0.04) },
        }}
      >
        {content}
      </ButtonBase>
    );

  return (
    <Box sx={{ flexShrink: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{
          m: 0,
          px: expanded ? 2 : 1,
          pt: 1.25,
          pb: 0.75,
          fontSize: "0.6875rem",
          letterSpacing: "0.02em",
          textAlign: expanded ? "left" : "center",
          opacity: 0.85,
        }}
      >
        {versionLabel}
      </Typography>
      <Divider sx={{ borderColor: "divider" }} />
      {panel}
    </Box>
  );
};
