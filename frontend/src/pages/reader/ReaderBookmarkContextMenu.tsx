import { READ_HIGHLIGHT_PRESET_COLORS } from "../../utils/readerHighlightColors";
import type { BookmarkMenuState } from "./readerPageTypes";
import { Box, Divider, Menu, MenuItem, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  bookmarkMenu: BookmarkMenuState | null;
  onClose: () => void;
  onSaveBookmark: () => void;
  onPickHighlightColor: (color: string) => void;
  t: TFunction<"reader">;
};

export const ReaderBookmarkContextMenu = ({ bookmarkMenu, onClose, onSaveBookmark, onPickHighlightColor, t }: Props) => (
  <Menu
    open={bookmarkMenu != null}
    onClose={onClose}
    anchorReference="anchorPosition"
    anchorPosition={bookmarkMenu != null ? { top: bookmarkMenu.mouseY, left: bookmarkMenu.mouseX } : undefined}
  >
    <MenuItem onClick={onSaveBookmark}>{t("contextSaveBookmark")}</MenuItem>
    <Divider sx={{ my: 0.5 }} />
    <MenuItem
      disableRipple
      sx={{ cursor: "default", py: 1, "&:hover": { bgcolor: "transparent" } }}
      onClick={(e) => e.preventDefault()}
    >
      <Box sx={{ width: "100%" }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
          {t("contextHighlightSection")}
        </Typography>
        {!bookmarkMenu?.highlight ? (
          <Typography variant="caption" color="text.disabled">
            {t("contextHighlightNeedSelection")}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {READ_HIGHLIGHT_PRESET_COLORS.map((c) => (
              <Box
                key={c}
                component="button"
                type="button"
                title={c}
                aria-label={t("contextHighlightSwatch", { color: c })}
                onClick={(e) => {
                  e.stopPropagation();
                  void onPickHighlightColor(c);
                }}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  bgcolor: c,
                  border: "1px solid rgba(255,255,255,0.25)",
                  cursor: "pointer",
                  p: 0,
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </MenuItem>
  </Menu>
);
