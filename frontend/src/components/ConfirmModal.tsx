import CloseIcon from "@mui/icons-material/Close";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
};

const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
}: ConfirmModalProps) => {
  const { t } = useTranslation("common");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, loading]);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      role="dialog"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
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
      <DialogTitle id="confirm-modal-title" sx={{ pr: 6, flexShrink: 0, position: "relative" }}>
        {title}
        <IconButton
          aria-label={t("close")}
          disabled={loading}
          onClick={onClose}
          size="small"
          sx={{ position: "absolute", right: 8, top: 8, color: "text.secondary" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: "auto", flex: "1 1 auto", minHeight: 0 }}>
        <Typography id="confirm-modal-desc" variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexShrink: 0, flexWrap: { xs: "wrap", sm: "nowrap" } }}>
        <Button fullWidth variant="text" disabled={loading} onClick={onClose} color="inherit" sx={{ width: { sm: "auto" }, flex: { sm: 1 } }}>
          {cancelLabel ?? t("cancel")}
        </Button>
        <Button
          fullWidth
          variant="contained"
          disabled={loading}
          onClick={onConfirm}
          sx={(th) => ({
            width: { sm: "auto" },
            flex: 1,
            bgcolor: alpha(th.palette.error.main, 0.85),
            color: th.palette.error.contrastText,
            "&:hover": { bgcolor: th.palette.error.main },
          })}
        >
          {loading ? t("loadingEllipsis") : (confirmLabel ?? t("remove"))}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmModal;
