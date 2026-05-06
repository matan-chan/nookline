import { useAdminUserAvatarObjectUrl } from "../../hooks/useAdminUserAvatarObjectUrl";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { Avatar, Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import type { TFunction } from "i18next";

export type SettingsUserRowModel = {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  hasAvatar?: boolean;
};

const avatarSx = (th: Theme) => ({
  width: 48,
  height: 48,
  flexShrink: 0,
  borderRadius: 1.75,
  fontSize: "1.125rem",
  fontWeight: 700,
  bgcolor: alpha(th.palette.primary.main, 0.16),
  color: "primary.main",
  "& .MuiAvatar-img": { objectFit: "cover", objectPosition: "center" },
});

export const SettingsUserListRow = ({
  row,
  isSelf,
  onRequestDelete,
  t,
}: {
  row: SettingsUserRowModel;
  isSelf: boolean;
  onRequestDelete: () => void;
  t: TFunction<"auth">;
}) => {
  const avatarUrl = useAdminUserAvatarObjectUrl(row.id, Boolean(row.hasAvatar));
  const initial = row.username.trim().charAt(0).toUpperCase() || "?";
  const roleLabel = row.isAdmin ? t("userRoleAdmin") : t("userRoleMember");

  return (
    <Paper
      component="li"
      elevation={0}
      sx={(th) => ({
        display: "flex",
        alignItems: "center",
        gap: 2,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: th.surfaces.low,
      })}
    >
      <Avatar src={avatarUrl ?? undefined} alt="" sx={avatarSx}>
        {initial}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.35 }} noWrap title={row.username}>
          {row.username}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {roleLabel}
        </Typography>
      </Box>
      <Box sx={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {!isSelf ? (
          <Tooltip title={t("removeUser")}>
            <IconButton
              size="small"
              aria-label={t("removeUser")}
              onClick={() => {
                onRequestDelete();
              }}
              sx={{ color: "error.main" }}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
    </Paper>
  );
};
