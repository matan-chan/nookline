import MoreVert from "@mui/icons-material/MoreVert";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { clampPdfZoom, PDF_ZOOM_STEP } from "./PdfZoomToolbar";

type Props = {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
};

export const PdfZoomMenu = ({ zoom, setZoom }: Props) => {
  const { t } = useTranslation("reader");
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  const open = Boolean(anchor);

  return (
    <>
      <IconButton
        size="small"
        aria-label={t("pdfViewMenu")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ flexShrink: 0, color: "text.secondary" }}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{
          paper: { sx: { minWidth: 200 } },
        }}
      >
        <MenuItem
          disabled
          dense
          sx={{
            fontSize: "0.8125rem",
            color: "text.secondary",
            "&.Mui-disabled": { opacity: 1 },
          }}
        >
          {Math.round(zoom * 100)}%
        </MenuItem>
        <MenuItem
          onClick={() => {
            setZoom((z) => clampPdfZoom(z - PDF_ZOOM_STEP));
            close();
          }}
        >
          {t("zoomOut")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setZoom((z) => clampPdfZoom(z + PDF_ZOOM_STEP));
            close();
          }}
        >
          {t("zoomIn")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setZoom(1);
            close();
          }}
        >
          {t("fitPage")}
        </MenuItem>
      </Menu>
    </>
  );
};
