import DeleteOutline from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, ListItemIcon, Menu, MenuItem } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ConfirmModal from "./ConfirmModal";

type CardOverflowMenuProps = {
  onRemove: () => void;
  variant: "book" | "series" | "volume";
  itemTitle: string;
};

const CardOverflowMenu = ({ onRemove, variant, itemTitle }: CardOverflowMenuProps) => {
  const { t } = useTranslation("cardMenu");
  const { t: tc } = useTranslation("common");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const titleKey =
    variant === "series" ? "confirmRemoveSeriesTitle" : variant === "volume" ? "confirmRemoveVolumeTitle" : "confirmRemoveBookTitle";
  const messageKey =
    variant === "series"
      ? "confirmRemoveSeriesMessage"
      : variant === "volume"
        ? "confirmRemoveVolumeMessage"
        : "confirmRemoveBookMessage";

  const handleRemoveClick = () => {
    setAnchorEl(null);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    onRemove();
    setConfirmOpen(false);
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={t("moreOptions")}
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        sx={(th) => ({
          position: "absolute",
          top: 6,
          right: 6,
          zIndex: 20,
          bgcolor: alpha(th.surfaces.highest, 0.85),
          color: "text.secondary",
          "&:hover": { bgcolor: th.surfaces.highest, color: "text.primary" },
        })}
      >
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => setAnchorEl(null)}
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
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveClick();
          }}
          sx={{ color: "error.main", fontSize: "0.75rem" }}
        >
          <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
            <DeleteOutline sx={{ fontSize: 18 }} />
          </ListItemIcon>
          {tc("remove")}
        </MenuItem>
      </Menu>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={t(titleKey)}
        message={t(messageKey, { title: itemTitle })}
        confirmLabel={tc("remove")}
      />
    </>
  );
};

export default CardOverflowMenu;
