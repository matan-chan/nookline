import { Alert, Button, Snackbar } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const DEFERRED_DELETE_MS = 6000;

export const useDeferredDeleteSnackbar = () => {
  const { t } = useTranslation("common");
  const [message, setMessage] = useState<string | null>(null);
  const undoRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const schedule = useCallback(
    (label: string, commit: () => void | Promise<unknown>, onUndo?: () => void) => {
      clearTimer();
      undoRef.current = onUndo ?? null;
      setMessage(label);
      timerRef.current = setTimeout(() => {
        setMessage(null);
        undoRef.current = null;
        void commit();
      }, DEFERRED_DELETE_MS);
    },
    [clearTimer]
  );

  const handleUndo = useCallback(() => {
    clearTimer();
    undoRef.current?.();
    undoRef.current = null;
    setMessage(null);
  }, [clearTimer]);

  const snackbar = (
    <Snackbar
      open={message != null}
      onClose={(_, reason) => {
        if (reason === "escapeKeyDown") handleUndo();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ mb: { xs: 2, md: 3 } }}
    >
      {message ? (
        <Alert
          severity="info"
          variant="filled"
          icon={false}
          sx={{
            width: "100%",
            maxWidth: { xs: "min(calc(100vw - 32px), 440px)", sm: 440 },
            alignItems: "center",
            py: 1.25,
            px: 2,
            boxShadow: (th) => th.shadows[12],
            backdropFilter: "blur(10px)",
            bgcolor: (th) =>
              th.palette.mode === "dark" ? alpha(th.palette.grey[900], 0.94) : th.palette.grey[900],
            color: "common.white",
            border: (th) => `1px solid ${alpha(th.palette.common.white, th.palette.mode === "dark" ? 0.12 : 0.08)}`,
            "& .MuiAlert-message": {
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              typography: "body2",
              fontWeight: 500,
            },
            "& .MuiAlert-action": { pt: 0, mr: -0.5, alignItems: "center", flexShrink: 0 },
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleUndo}
              sx={{ fontWeight: 700, flexShrink: 0, color: "common.white", textDecoration: "underline" }}
            >
              {t("undo")}
            </Button>
          }
        >
          {message}
        </Alert>
      ) : (
        <span />
      )}
    </Snackbar>
  );

  return { schedule, snackbar };
};