import { LIBRARY_BANNER_COUNT, libraryBannerPickerThumbUrl } from "../../pages/library/libraryBannerPublicPath";
import { DETAIL_LAVENDER } from "../../pages/detail/detailPurpleAccent";
import { LIBRARY_MODAL_FORM_LABEL_SX } from "./libraryFormConstants";
import { Box, FormControl, FormLabel, Typography } from "@mui/material";

type Props = {
  builtInLabel: string;
  customLabel: string;
  customBanners: { id: number; url: string }[];
  selectedBuiltinIndex: number;
  selectedCustomId: number | null;
  onSelectBuiltin: (index: number) => void;
  onSelectCustom: (id: number) => void;
};

const indices = Array.from({ length: LIBRARY_BANNER_COUNT }, (_, i) => i);

const tileOutline = (selected: boolean) =>
  selected ? `2px solid ${DETAIL_LAVENDER}` : "2px solid transparent";

const LibraryBannerPicker = ({
  builtInLabel,
  customLabel,
  customBanners,
  selectedBuiltinIndex,
  selectedCustomId,
  onSelectBuiltin,
  onSelectCustom,
}: Props) => (
  <FormControl fullWidth>
    <FormLabel sx={LIBRARY_MODAL_FORM_LABEL_SX}>{builtInLabel}</FormLabel>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(4, 1fr)" },
        gap: 1,
        mt: 1,
      }}
    >
      {indices.map((i) => {
        const selected = selectedCustomId == null && selectedBuiltinIndex === i;
        return (
          <Box
            key={i}
            component="button"
            type="button"
            onClick={() => onSelectBuiltin(i)}
            aria-pressed={selected}
            aria-label={`${builtInLabel} ${i + 1}`}
            sx={{
              p: 0,
              m: 0,
              border: "none",
              cursor: "pointer",
              bgcolor: "transparent",
              borderRadius: 1,
              outline: tileOutline(selected),
              outlineOffset: 2,
              "&:focus-visible": { outline: `2px solid ${DETAIL_LAVENDER}`, outlineOffset: 2 },
            }}
          >
            <Box
              component="img"
              src={libraryBannerPickerThumbUrl(i)}
              alt=""
              sx={{
                width: "100%",
                aspectRatio: "16 / 9",
                objectFit: "cover",
                borderRadius: 1,
                display: "block",
              }}
            />
          </Box>
        );
      })}
    </Box>

    {customBanners.length > 0 ? (
      <>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block", fontWeight: 600, letterSpacing: "0.08em" }}>
          {customLabel}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(4, 1fr)" },
            gap: 1,
            mt: 1,
          }}
        >
          {customBanners.map((b) => {
            const selected = selectedCustomId === b.id;
            return (
              <Box
                key={b.id}
                component="button"
                type="button"
                onClick={() => onSelectCustom(b.id)}
                aria-pressed={selected}
                aria-label={`${customLabel} ${b.id}`}
                sx={{
                  p: 0,
                  m: 0,
                  border: "none",
                  cursor: "pointer",
                  bgcolor: "transparent",
                  borderRadius: 1,
                  outline: tileOutline(selected),
                  outlineOffset: 2,
                  "&:focus-visible": { outline: `2px solid ${DETAIL_LAVENDER}`, outlineOffset: 2 },
                }}
              >
                <Box
                  component="img"
                  src={b.url}
                  alt=""
                  sx={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    objectFit: "cover",
                    borderRadius: 1,
                    display: "block",
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </>
    ) : null}
  </FormControl>
);

export default LibraryBannerPicker;
