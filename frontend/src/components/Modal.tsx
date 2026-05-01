import CloseIcon from "@mui/icons-material/Close";
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

const Modal = ({ open, onClose, title, children }: ModalProps) => {
  const { t } = useTranslation("common");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(6px)" } },
      }}
      PaperProps={{
        sx: (th) => ({
          bgcolor: alpha(th.palette.background.paper, 0.96),
          backdropFilter: "blur(24px)",
          border: `1px solid ${alpha(th.palette.divider, 0.5)}`,
          boxShadow: `0 0 40px 0 ${alpha(th.palette.primary.main, 0.08)}`,
          maxHeight: "calc(100dvh - 40px)",
          width: "100%",
          maxWidth: { xs: "calc(100% - 24px)", sm: `min(${th.breakpoints.values.sm}px, calc(100vw - 48px))` },
          m: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
        }),
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1, flexShrink: 0 }}>
        {title}
        <IconButton aria-label={t("close")} onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2, overflow: "auto", flex: "1 1 auto", minHeight: 0 }}>
        <Box>{children}</Box>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
