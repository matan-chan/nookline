import DeleteOutline from "@mui/icons-material/DeleteOutline";
import {
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { NavLink } from "react-router-dom";
import type { LibraryNavItem } from "./layoutConstants";
import { libraryGlyph } from "./libraryGlyph";
import { navItemButtonSx } from "./navItemStyles";

export const LibraryNavItemRow = ({
  lib,
  expanded,
  onRequestDelete,
  deleteAriaLabel,
  onNavigate,
}: {
  lib: LibraryNavItem;
  expanded: boolean;
  onRequestDelete: (lib: LibraryNavItem) => void;
  deleteAriaLabel: string;
  onNavigate?: () => void;
}) => (
  <ListItem
    disablePadding
    sx={{ display: "block" }}
    secondaryAction={
      expanded ? (
        <IconButton
          size="small"
          edge="end"
          aria-label={deleteAriaLabel}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestDelete(lib);
          }}
          sx={(t) => ({
            mr: 0.25,
            color: "text.secondary",
            "&:hover": { color: t.palette.error.main, bgcolor: alpha(t.palette.error.main, 0.08) },
          })}
        >
          <DeleteOutline sx={{ fontSize: "1.125rem" }} />
        </IconButton>
      ) : undefined
    }
  >
    <ListItemButton
      component={NavLink}
      to={`/library/${lib.id}`}
      onClick={() => onNavigate?.()}
      sx={(theme) => ({
        ...navItemButtonSx(theme, expanded),
        ...(expanded ? { pr: 6 } : {}),
      })}
    >
      <ListItemIcon
        sx={{
          minWidth: expanded ? 40 : 0,
          width: 40,
          pl: 0,
          justifyContent: "center",
          color: "inherit",
          "& .MuiSvgIcon-root": { fontSize: "1.25rem" },
        }}
      >
        {libraryGlyph(lib.type)}
      </ListItemIcon>
      {expanded ? (
        <ListItemText primary={lib.name} primaryTypographyProps={{ variant: "body2", fontWeight: 500, noWrap: true }} />
      ) : null}
    </ListItemButton>
  </ListItem>
);
