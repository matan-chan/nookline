import DeleteOutline from "@mui/icons-material/DeleteOutline";
import EditOutlined from "@mui/icons-material/EditOutlined";
import SyncOutlined from "@mui/icons-material/SyncOutlined";
import { ListItemIcon, Menu, MenuItem } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"dashboard">;
  anchorEl: HTMLElement | null;
  syncing: boolean;
  onClose: () => void;
  onSync: () => void;
  onEditSettings: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
};

export const DashboardLibraryCardMenu = ({ t, anchorEl, syncing, onClose, onSync, onEditSettings, onDelete }: Props) => (
  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    transformOrigin={{ vertical: "top", horizontal: "right" }}
    slotProps={{
      paper: {
        sx: (th) => ({
          minWidth: 120,
          bgcolor: alpha(th.surfaces.high, 0.95),
          backdropFilter: "blur(12px)",
          border: `1px solid ${alpha(th.palette.divider, 0.3)}`,
        }),
      },
    }}
  >
    <MenuItem
      disabled={syncing}
      onClick={(e) => {
        e.stopPropagation();
        onSync();
      }}
      sx={{ fontSize: "0.75rem" }}
    >
      <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
        <SyncOutlined sx={{ fontSize: 18 }} />
      </ListItemIcon>
      {t("refetchLibrary")}
    </MenuItem>
    <MenuItem onClick={onEditSettings} sx={{ fontSize: "0.75rem" }}>
      <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
        <EditOutlined sx={{ fontSize: 18 }} />
      </ListItemIcon>
      {t("editLibrarySettings")}
    </MenuItem>
    <MenuItem onClick={onDelete} sx={{ fontSize: "0.75rem", color: "error.main" }}>
      <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
        <DeleteOutline sx={{ fontSize: 18 }} />
      </ListItemIcon>
      {t("deleteLibrary")}
    </MenuItem>
  </Menu>
);
