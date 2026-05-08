import ConfirmModal from "../../../../components/ConfirmModal";
import { Button, Stack, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"settings">;
  hasOverrides: boolean | undefined;
  busy: boolean;
  resettingCustomization: boolean;
  resetDialogOpen: boolean;
  setResetDialogOpen: (v: boolean) => void;
  onConfirmReset: () => void;
  resetDoneHint: string | null;
};

export const SettingsCustomizationReset = ({
  t,
  hasOverrides,
  busy,
  resettingCustomization,
  resetDialogOpen,
  setResetDialogOpen,
  onConfirmReset,
  resetDoneHint,
}: Props) => (
  <>
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      flexWrap="wrap"
      sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}
    >
      <Button
        variant="outlined"
        color="error"
        size="small"
        disabled={busy || resettingCustomization || !hasOverrides}
        onClick={() => setResetDialogOpen(true)}
      >
        {t("resetCustomization")}
      </Button>
      {resetDoneHint ? (
        <Typography variant="caption" color="success.main">
          {resetDoneHint}
        </Typography>
      ) : null}
    </Stack>

    <ConfirmModal
      open={resetDialogOpen}
      onClose={() => {
        if (!resettingCustomization) setResetDialogOpen(false);
      }}
      onConfirm={() => void onConfirmReset()}
      title={t("resetCustomizationTitle")}
      message={t("resetCustomizationDetail")}
      confirmLabel={t("resetCustomizationConfirm")}
      loading={resettingCustomization}
    />
  </>
);
