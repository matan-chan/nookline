import LibraryBooksOutlined from "@mui/icons-material/LibraryBooksOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import ViewModuleOutlined from "@mui/icons-material/ViewModuleOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import { DETAIL_LAVENDER } from "../detail/detailPurpleAccent";
import type { LibraryHeroBannerMenu, LibraryHeroBannerModel } from "./libraryHeroBannerTypes";
import { Box, CircularProgress, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { TFunction } from "i18next";

type Props = {
  loading: boolean;
  library: LibraryHeroBannerModel | null | undefined;
  t: TFunction<"library">;
  menu?: LibraryHeroBannerMenu | null;
  menuAnchor: HTMLElement | null;
  setMenuAnchor: (el: HTMLElement | null) => void;
};

export const LibraryHeroBannerBody = ({ loading, library, t, menu, menuAnchor, setMenuAnchor }: Props) => {
  const name = library?.name ?? t("defaultLibraryName");
  const typeLabel = library?.type?.trim() ?? "";
  const seriesCount = library?.series.length ?? 0;
  const standaloneCount = library?.books.filter((b) => !b.seriesId).length ?? 0;
  const totalSeriesVolumes = library?.series.reduce((n, s) => n + s.books.length, 0) ?? 0;
  const showStats = Boolean(library);
  const showMenu = Boolean(menu && library);

  return (
    <Stack
      spacing={{ xs: 1, sm: 1.25 }}
      sx={{
        position: "relative",
        zIndex: 1,
        minHeight: { xs: 300, sm: 360, md: 440 },
        justifyContent: "flex-end",
        px: { xs: 2.5, sm: 3, md: 4 },
        pt: { xs: 2, sm: 2.5, md: 3 },
        pb: { xs: 3.25, sm: 3.75, md: 4.25 },
        transform: "translateY(-10px)",
      }}
    >
      {loading && !library ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, py: 4 }}>
          <CircularProgress size={36} sx={{ color: DETAIL_LAVENDER }} />
        </Box>
      ) : (
        <>
          <Typography
            variant="overline"
            sx={{
              color: DETAIL_LAVENDER,
              letterSpacing: "0.14em",
              fontWeight: 600,
              fontSize: "0.7rem",
              lineHeight: 1.4,
            }}
          >
            {typeLabel ? `${t("heroEyebrowLibrary")} · ${typeLabel.toUpperCase()}` : t("heroEyebrowLibrary")}
          </Typography>
          <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={0.5} rowGap={0.25}>
            <Typography
              component="h1"
              sx={{
                typography: { xs: "h4", sm: "h3", md: "h2" },
                fontWeight: 800,
                color: "common.white",
                lineHeight: 1.12,
                textShadow: "0 2px 24px rgba(0,0,0,0.45)",
              }}
            >
              {name}
            </Typography>
            {showMenu && menu ? (
              <>
                <IconButton
                  size="small"
                  aria-label={menu.ariaLabel}
                  aria-haspopup="true"
                  aria-expanded={Boolean(menuAnchor)}
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  sx={{
                    color: alpha("#fff", 0.92),
                    p: 0.35,
                    ml: { xs: -0.25, sm: 0 },
                    "&:hover": { bgcolor: alpha("#fff", 0.14) },
                  }}
                >
                  <MoreVert sx={{ fontSize: "1.35rem" }} />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  slotProps={{
                    paper: {
                      sx: (th) => ({
                        mt: 0.5,
                        minWidth: 160,
                        borderRadius: 2,
                        border: `1px solid ${alpha(th.palette.divider, 0.35)}`,
                        bgcolor: alpha(th.palette.background.paper, 0.98),
                      }),
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      menu.onEdit();
                    }}
                  >
                    {menu.editLabel}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      menu.onDelete();
                    }}
                    sx={(th) => ({ color: th.palette.error.main })}
                  >
                    {menu.deleteLabel}
                  </MenuItem>
                </Menu>
              </>
            ) : null}
          </Stack>
          {showStats ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: { xs: 1, sm: 1.5 },
                rowGap: 1,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: alpha("#fff", 0.88) }}>
                <ViewModuleOutlined sx={{ fontSize: 18, opacity: 0.9 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                  {t("heroStatSeries", { count: seriesCount })}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: alpha("#fff", 0.88) }}>
                <MenuBookOutlined sx={{ fontSize: 18, opacity: 0.9 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                  {t("heroStatStandalone", { count: standaloneCount })}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ color: alpha("#fff", 0.88) }}>
                <LibraryBooksOutlined sx={{ fontSize: 18, opacity: 0.9 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                  {t("heroStatVolumes", { count: totalSeriesVolumes })}
                </Typography>
              </Stack>
            </Box>
          ) : null}
        </>
      )}
    </Stack>
  );
};
