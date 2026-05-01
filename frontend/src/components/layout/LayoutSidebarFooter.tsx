import { useAuth } from "../../auth/AuthContext";
import { useAvatarObjectUrl } from "../../hooks/useAvatarObjectUrl";
import { Avatar, Box, ButtonBase, Typography } from "@mui/material";
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

  if (user == null) {
    return (
      <Box sx={{ px: expanded ? 2 : 1, py: 2, display: "flex", justifyContent: expanded ? "flex-start" : "center", flexShrink: 0 }}>{content}</Box>
    );
  }

  return (
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
};
