import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { navItemButtonSx } from "./navItemStyles";

export const NavItemLink = ({
  to,
  label,
  icon,
  end,
  expanded,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) => (
  <ListItem disablePadding sx={{ display: "block", flex: "0 0 auto" }}>
    <ListItemButton
      component={NavLink}
      to={to}
      end={end}
      onClick={() => onNavigate?.()}
      sx={(theme) => navItemButtonSx(theme, expanded)}
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
        {icon}
      </ListItemIcon>
      {expanded ? (
        <ListItemText primary={label} primaryTypographyProps={{ variant: "body2", fontWeight: 500, noWrap: true }} />
      ) : null}
    </ListItemButton>
  </ListItem>
);
