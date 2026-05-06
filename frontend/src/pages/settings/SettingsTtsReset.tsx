import ConfirmModal from "../../components/ConfirmModal";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"settings">;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
};

export const SettingsTtsResetDialog = ({ t, open, onClose, onConfirm, loading }: Props) => (
  <ConfirmModal
    open={open}
    onClose={onClose}
    onConfirm={() => void onConfirm()}
    title={t("resetTtsTitle")}
    message={t("resetTtsDetail")}
    confirmLabel={t("resetTtsConfirm")}
    loading={loading}
  />
);
