import { LibraryHeroBackdrop } from "./LibraryHeroBackdrop";
import { LibraryHeroBannerBody } from "./LibraryHeroBannerBody";
import type { LibraryHeroBackground } from "./resolveLibraryHeroBackgroundUrl";
import { Box } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LibraryHeroBannerMenu, LibraryHeroBannerModel } from "./libraryHeroBannerTypes";

export type { LibraryHeroBannerModel, LibraryHeroBannerMenu } from "./libraryHeroBannerTypes";

type Props = {
  loading: boolean;
  library: LibraryHeroBannerModel | null | undefined;
  heroBackground: LibraryHeroBackground | null;
  menu?: LibraryHeroBannerMenu | null;
};

export const LibraryHeroBanner = ({ loading, library, heroBackground, menu }: Props) => {
  const { t } = useTranslation("library");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      role="region"
      aria-label={t("heroBannerAria")}
      sx={(th) => {
        const pageBg = th.palette.background.default;
        return {
          position: "relative",
          width: "100%",
          minHeight: { xs: 300, sm: 360, md: 440 },
          overflow: "hidden",
          bgcolor: pageBg,
        };
      }}
    >
      <LibraryHeroBackdrop heroBackground={heroBackground} />
      <LibraryHeroBannerBody
        loading={loading}
        library={library}
        t={t}
        menu={menu}
        menuAnchor={menuAnchor}
        setMenuAnchor={setMenuAnchor}
      />
    </Box>
  );
};
