import { sanitizeLettersDigitsAndWhitespace } from "../../utils/sanitizeUserInput";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { LibrarySortOption } from "./libraryBrowserTypes";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"library">;
  search: string;
  setSearch: (v: string) => void;
  sort: LibrarySortOption;
  setSort: (v: LibrarySortOption) => void;
  onAddBook: () => void;
};

export const LibraryBrowserToolbar = ({ t, search, setSearch, sort, setSort, onAddBook }: Props) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-start", gap: 2 }}>
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
        gap: 1.5,
        width: { xs: "100%", md: "auto" },
        flexDirection: { xs: "column", sm: "row" },
      }}
    >
      <Button
        variant="contained"
        onClick={onAddBook}
        sx={{
          background: "linear-gradient(135deg, #ba9eff, #8455ef)",
          color: "#000",
          fontWeight: 600,
          textTransform: "none",
          width: { xs: "100%", sm: "auto" },
        }}
      >
        {t("addBook")}
      </Button>

      <TextField size="small" placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(sanitizeLettersDigitsAndWhitespace(e.target.value))} sx={{ width: { xs: "100%", sm: 192 }, minWidth: 0 }} />

      <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 140 }, width: { xs: "100%", sm: "auto" } }}>
        <InputLabel id="sort-label">{t("sortLabel")}</InputLabel>
        <Select labelId="sort-label" label={t("sortLabel")} value={sort} onChange={(e) => setSort(e.target.value as LibrarySortOption)}>
          <MenuItem value="title">{t("sortTitle")}</MenuItem>
          <MenuItem value="newest">{t("sortNewest")}</MenuItem>
          <MenuItem value="status">{t("sortStatus")}</MenuItem>
        </Select>
      </FormControl>
    </Box>
  </Box>
);
