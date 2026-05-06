import { Box, Button, Drawer, FormControl, IconButton, InputLabel, List, ListItemButton, ListItemText, MenuItem, Select, TextField, Typography } from "@mui/material";
import { sanitizeLettersDigitsAndWhitespace } from "../../utils/sanitizeUserInput";
import type { LibrarySortOption } from "./libraryBrowserTypes";
import SwapVert from "@mui/icons-material/SwapVert";
import Add from "@mui/icons-material/Add";
import type { TFunction } from "i18next";
import { useState } from "react";

type Props = {
  t: TFunction<"library">;
  search: string;
  setSearch: (v: string) => void;
  sort: LibrarySortOption;
  setSort: (v: LibrarySortOption) => void;
  onAddBook: () => void;
};

const SORT_OPTIONS: LibrarySortOption[] = ["title", "newest", "status"];

const sortLabelFor = (t: TFunction<"library">, key: LibrarySortOption) => {
  if (key === "title") return t("sortTitle");
  if (key === "newest") return t("sortNewest");
  return t("sortStatus");
};

export const LibraryBrowserToolbar = ({ t, search, setSearch, sort, setSort, onAddBook }: Props) => {
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const pickSort = (v: LibrarySortOption) => {
    setSort(v);
    setSortSheetOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          gap: 1,
          width: "100%",
        }}
      >
        <TextField
          size="small"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(sanitizeLettersDigitsAndWhitespace(e.target.value))}
          inputProps={{ "aria-label": t("searchPlaceholder") }}
          sx={{
            flex: 1,
            minWidth: 0,
            "& .MuiOutlinedInput-root": {
              borderRadius: 9999,
              minHeight: 36,
              bgcolor: (th) => th.surfaces.container,
              fontSize: "0.875rem",
              "& fieldset": {
                borderColor: (th) => th.palette.divider,
              },
              "&:hover fieldset": {
                borderColor: (th) => th.palette.divider,
              },
            },
          }}
        />

        <IconButton
          size="small"
          color="inherit"
          onClick={onAddBook}
          aria-label={t("addBook")}
          sx={{
            flexShrink: 0,
            width: 36,
            height: 36,
            p: 0,
            background: "linear-gradient(135deg, #ba9eff, #8455ef)",
            color: "#000",
            "&:hover": {
              background: "linear-gradient(135deg, #c9b0ff, #9469f5)",
            },
          }}
        >
          <Add sx={{ fontSize: 20 }} />
        </IconButton>

        <IconButton
          size="small"
          color="inherit"
          onClick={() => setSortSheetOpen(true)}
          aria-label={t("sortLabel")}
          aria-haspopup="dialog"
          sx={{
            flexShrink: 0,
            width: 36,
            height: 36,
            p: 0,
            borderRadius: 1.5,
            bgcolor: (th) => th.surfaces.container,
            border: (th) => `1px solid ${th.palette.divider}`,
            color: "text.secondary",
          }}
        >
          <SwapVert sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: { xs: "none", md: "flex" }, flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <Button
          variant="contained"
          onClick={onAddBook}
          sx={{
            background: "linear-gradient(135deg, #ba9eff, #8455ef)",
            color: "#000",
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          {t("addBook")}
        </Button>

        <TextField size="small" placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(sanitizeLettersDigitsAndWhitespace(e.target.value))} sx={{ width: 192, minWidth: 0 }} />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="sort-label">{t("sortLabel")}</InputLabel>
          <Select labelId="sort-label" label={t("sortLabel")} value={sort} onChange={(e) => setSort(e.target.value as LibrarySortOption)}>
            <MenuItem value="title">{t("sortTitle")}</MenuItem>
            <MenuItem value="newest">{t("sortNewest")}</MenuItem>
            <MenuItem value="status">{t("sortStatus")}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Drawer
        anchor="bottom"
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, px: 1, pt: 2, pb: `max(16px, env(safe-area-inset-bottom, 0px))`, bgcolor: (th) => th.surfaces.low } }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, px: 2, pb: 1 }}>
          {t("sortLabel")}
        </Typography>
        <List dense disablePadding sx={{ px: 1 }}>
          {SORT_OPTIONS.map((opt) => (
            <ListItemButton key={opt} selected={sort === opt} onClick={() => pickSort(opt)}>
              <ListItemText primary={sortLabelFor(t, opt)} primaryTypographyProps={{ fontWeight: sort === opt ? 600 : 400 }} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
};
