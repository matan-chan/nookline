import DeleteOutline from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, ListItemIcon, Menu, MenuItem } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useTranslation } from "react-i18next";
type CardOverflowMenuProps = {
  onRemove: () => void;
  variant: "book" | "series" | "volume";
  itemTitle: string;
};

const CardOverflowMenu = ({ onRemove }: CardOverflowMenuProps) => {
  const { t } = useTranslation("cardMenu");
  const { t: tc } = useTranslation("common");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleRemoveClick = () => {
    setAnchorEl(null);
    onRemove();
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
          top: 4,
          right: 4,
          zIndex: 20,
          minWidth: 40,
          minHeight: 40,
          bgcolor: alpha(th.surfaces.highest, 0.85),
          color: "text.secondary",
          "&:hover": { bgcolor: th.surfaces.highest, color: "text.primary" },
          "&:focus-visible": { outline: `2px solid ${alpha(th.palette.primary.main, 0.55)}`, outlineOffset: 2 },
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
    </>
  );
};

export default CardOverflowMenu;
