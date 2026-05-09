import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import ConfirmModal from "../../../components/ConfirmModal";
import { useAuth } from "../../../auth/AuthContext";
import { SectionTitle, SettingsCard } from "../SettingsPrimitives";
import { SettingsUserListRow, type SettingsUserRowModel } from "./components/SettingsUserListRow";
import { SettingsUsersCreateForm } from "./components/SettingsUsersCreateForm";
import { useSettingsUsersData } from "./hooks/useSettingsUsersData";
import { alpha } from "@mui/material/styles";
import { Alert, Divider, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const SettingsUsersCard = () => {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<SettingsUserRowModel | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { rows, loadErr, setLoadErr, loading, createUser, deleteUser } = useSettingsUsersData(t, Boolean(user?.isAdmin));

  if (user == null || !user.isAdmin) return null;

  const handleConfirmDelete = async () => {
    if (pendingDelete == null) return;
    setDeleteErr(null);
    setDeleteBusy(true);
    const result = await deleteUser(pendingDelete.id);
    setDeleteBusy(false);
    if (!result.ok) {
      setDeleteErr(result.error);
      return;
    }
    setPendingDelete(null);
  };

  const requestDelete = (row: SettingsUserRowModel) => {
    setDeleteErr(null);
    setPendingDelete(row);
  };

  return (
    <Stack spacing={2}>
      <SectionTitle icon={<ManageAccountsOutlined />}>{t("sectionUsers")}</SectionTitle>
      <SettingsCard>
        <Typography variant="body2" color="text.secondary">
          {t("usersDescription")}
        </Typography>
        {loadErr ? (
          <Alert severity="error" onClose={() => setLoadErr(null)}>
            {loadErr}
          </Alert>
        ) : null}
        {deleteErr ? (
          <Alert severity="error" onClose={() => setDeleteErr(null)} sx={{ mb: 1 }}>
            {deleteErr}
          </Alert>
        ) : null}
        {loading ? (
          <Typography variant="body2" color="text.secondary">…</Typography>
        ) : (
          <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
            {rows.map((row) => (
              <SettingsUserListRow key={row.id} row={row} isSelf={user.id === row.id} onRequestDelete={() => requestDelete(row)} t={t} />
            ))}
          </Stack>
        )}
        <Divider sx={(th) => ({ borderColor: alpha(th.palette.divider, th.palette.mode === "dark" ? 0.35 : 0.8), my: 2 })} />
        <Typography variant="subtitle2" sx={(th) => ({ color: alpha(th.palette.primary.main, 0.95), fontWeight: 600, letterSpacing: "0.04em", mb: 1.5 })}>
          {t("addUser")}
        </Typography>
        <SettingsUsersCreateForm t={t} onCreate={createUser} />
      </SettingsCard>
      <ConfirmModal
        open={pendingDelete != null}
        onClose={() => !deleteBusy && setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t("deleteUserTitle")}
        message={pendingDelete ? t("deleteUserMessage", { name: pendingDelete.username }) : ""}
        confirmLabel={tc("delete")}
        loading={deleteBusy}
      />
    </Stack>
  );
};

export default SettingsUsersCard;
