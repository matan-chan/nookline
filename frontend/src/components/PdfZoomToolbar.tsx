import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import type { Dispatch, SetStateAction } from "react";

export const PDF_MIN_ZOOM = 0.5;
export const PDF_MAX_ZOOM = 3;
export const PDF_ZOOM_STEP = 0.25;

export const clampPdfZoom = (z: number) => Math.min(PDF_MAX_ZOOM, Math.max(PDF_MIN_ZOOM, z));

const zoomBtnSx = (theme: Theme) => ({
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  px: 1.25,
  py: 0.5,
  minWidth: 0,
  color: "text.secondary",
  textTransform: "none" as const,
  fontSize: "0.875rem",
  "&:hover": { bgcolor: (th: Theme) => th.surfaces.container },
});

type PdfZoomToolbarProps = {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  zoomOutLabel: string;
  zoomInLabel: string;
  fitPageLabel: string;
};

export const PdfZoomToolbar = ({ zoom, setZoom, zoomOutLabel, zoomInLabel, fitPageLabel }: PdfZoomToolbarProps) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.primary" }}>
    <Button aria-label={zoomOutLabel} onClick={() => setZoom((z) => clampPdfZoom(z - PDF_ZOOM_STEP))} sx={zoomBtnSx}>
      −
    </Button>
    <Typography variant="body2" sx={{ minWidth: "3rem", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
      {Math.round(zoom * 100)}%
    </Typography>
    <Button aria-label={zoomInLabel} onClick={() => setZoom((z) => clampPdfZoom(z + PDF_ZOOM_STEP))} sx={zoomBtnSx}>
      +
    </Button>
    <Button onClick={() => setZoom(1)} sx={zoomBtnSx}>
      {fitPageLabel}
    </Button>
  </Box>
);
