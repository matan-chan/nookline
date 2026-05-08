import DashboardLibraryCard, { type DashboardLibraryPreview } from "./DashboardLibraryCard";
import { staggerGridChildrenSx } from "../../utils/staggerGridSx";
import type { LibraryNavItem } from "../../components/Layout";
import { Box, Typography } from "@mui/material";
import type { TFunction } from "i18next";

const toNavItem = (lib: DashboardLibraryPreview): LibraryNavItem => ({
  id: lib.id,
  name: lib.name,
  type: lib.type,
  path: lib.path,
  bannerIndex: lib.bannerIndex,
  customLibraryBannerId: lib.customLibraryBannerId,
});

type Props = {
  t: TFunction<"dashboard">;
  libraries: DashboardLibraryPreview[];
  onRequestDelete: (lib: LibraryNavItem) => void;
  onEditSettings: (lib: LibraryNavItem) => void;
};

export const DashboardLibrariesRow = ({ t, libraries, onRequestDelete, onEditSettings }: Props) => {
  if (libraries.length === 0) return null;
  return (
    <Box component="section">
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        {t("libraries")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          gap: 2,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": { display: "none" },
          pb: 0.5,
          mx: { xs: -2, sm: -3, md: -4 },
          px: { xs: 2, sm: 3, md: 4 },
          WebkitOverflowScrolling: "touch",
          ...staggerGridChildrenSx,
        }}
      >
        {libraries.map((lib) => (
          <DashboardLibraryCard
            key={lib.id}
            library={lib}
            onRequestDelete={(l) => onRequestDelete(toNavItem(l))}
            onEditSettings={(l) => onEditSettings(toNavItem(l))}
          />
        ))}
      </Box>
    </Box>
  );
};
