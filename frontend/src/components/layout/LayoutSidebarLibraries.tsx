import AddIcon from "@mui/icons-material/Add";
import { Box, Button, IconButton, List, ListItem } from "@mui/material";
import type { TFunction } from "i18next";
import { LibraryNavItemRow } from "./LibraryNavItemRow";
import { SidebarSection } from "./SidebarSection";
import type { LibraryNavItem } from "./layoutConstants";

type Props = {
  expanded: boolean;
  libraries: LibraryNavItem[];
  t: TFunction<"layout">;
  openAddLibrary: () => void;
  setLibraryPendingDelete: (lib: LibraryNavItem | null) => void;
  onNavigate?: () => void;
};

export const LayoutSidebarLibraries = ({ expanded, libraries, t, openAddLibrary, setLibraryPendingDelete, onNavigate }: Props) => (
  <Box sx={{ mt: 0.5, flex: "0 0 auto" }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: expanded ? "space-between" : "center",
        pr: expanded ? 1 : 0,
        pl: expanded ? 0 : 0,
      }}
    >
      <SidebarSection label={t("librariesSection")} expanded={expanded} />
      <IconButton
        size="small"
        onClick={openAddLibrary}
        sx={{
          mx: expanded ? 0 : "auto",
          color: "text.secondary",
          ...(expanded ? { mr: 0.5 } : {}),
        }}
        aria-label={t("addLibraryAria")}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>

    <List disablePadding>
      {libraries.length === 0 ? (
        expanded ? (
          <ListItem sx={{ px: 2, pt: 0.5, display: "block" }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={openAddLibrary}
              sx={{
                py: 1,
                justifyContent: "flex-start",
                textAlign: "left",
                borderStyle: "dashed",
                borderColor: "divider",
                color: "text.secondary",
                fontSize: "0.75rem",
                textTransform: "none",
              }}
            >
              {t("addFirstLibrary")}
            </Button>
          </ListItem>
        ) : (
          <ListItem disablePadding sx={{ display: "flex", justifyContent: "center", py: 0.5 }}>
            <IconButton size="small" onClick={openAddLibrary} aria-label={t("addLibraryAria")} sx={{ color: "text.secondary" }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </ListItem>
        )
      ) : (
        libraries.map((lib) => (
          <LibraryNavItemRow
            key={lib.id}
            lib={lib}
            expanded={expanded}
            onRequestDelete={setLibraryPendingDelete}
            deleteAriaLabel={t("deleteLibraryAria", { name: lib.name })}
            onNavigate={onNavigate}
          />
        ))
      )}
    </List>
  </Box>
);
