import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import { PasswordStrengthMeter } from "../../components/PasswordStrengthMeter";
import ConfirmModal from "../../components/ConfirmModal";
import { passwordIsStrongEnough } from "../../auth/passwordStrength";
import { buildAuthHeader, getStoredToken } from "../../auth/authStorage";
import { useAuth } from "../../auth/AuthContext";
import { SectionTitle, SettingsCard } from "./SettingsPrimitives";
import { SettingsUserListRow, type SettingsUserRowModel } from "./SettingsUserListRow";
import { alpha } from "@mui/material/styles";
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";

const USERNAME_RE = /^[a-zA-Z0-9_\p{L}]{2,32}$/u;

const USERNAME_ERROR_ID = "settings-new-username-error";

const SettingsUsersCard = () => {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const [rows, setRows] = useState<SettingsUserRowModel[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<SettingsUserRowModel | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const strong = passwordIsStrongEnough(password);
  const nameOk = USERNAME_RE.test(name.trim());

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    const token = getStoredToken();
    if (token == null) {
      setRows([]);
      setLoading(false);
      return;
    }
    const r = await fetch("/api/auth/users", { headers: { Accept: "application/json", ...buildAuthHeader(token) } });
    if (!r.ok) {
      setLoadErr(t("loadUsersFailed"));
      setRows([]);
      setLoading(false);
      return;
    }
    const j = (await r.json()) as { users?: SettingsUserRowModel[] };
    setRows(j.users ?? []);
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (user?.isAdmin) void loadUsers();
  }, [user?.isAdmin, loadUsers]);

  if (user == null || !user.isAdmin) return null;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    if (!strong || !nameOk) return;
    setBusy(true);
    try {
      const token = getStoredToken();
      if (token == null) {
        setFormErr(t("userCreateFailed"));
        return;
      }
      const r = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...buildAuthHeader(token) },
        body: JSON.stringify({ username: name.trim().toLowerCase(), password, isAdmin: asAdmin }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setFormErr(j.error ?? t("userCreateFailed"));
        return;
      }
      setName("");
      setPassword("");
      setAsAdmin(false);
      void loadUsers();
    } catch {
      setFormErr(t("userCreateFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    if (pendingDelete == null) return;
    setDeleteErr(null);
    setDeleteBusy(true);
    const token = getStoredToken();
    try {
      if (token == null) {
        setDeleteErr(t("deleteUserFailed"));
        return;
      }
      const r = await fetch(`/api/auth/users/${pendingDelete.id}`, { method: "DELETE", headers: { Accept: "application/json", ...buildAuthHeader(token) } });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setDeleteErr(j.error ?? t("deleteUserFailed"));
        return;
      }
      setPendingDelete(null);
      void loadUsers();
    } catch {
      setDeleteErr(t("deleteUserFailed"));
    } finally {
      setDeleteBusy(false);
    }
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
          <Typography variant="body2" color="text.secondary">
            …
          </Typography>
        ) : (
          <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
            {rows.map((row) => {
              const isSelf = user.id === row.id;
              return (
                <SettingsUserListRow
                  key={row.id}
                  row={row}
                  isSelf={isSelf}
                  onRequestDelete={() => {
                    setDeleteErr(null);
                    setPendingDelete(row);
                  }}
                  t={t}
                />
              );
            })}
          </Stack>
        )}
        <Divider
          sx={(th) => ({
            borderColor: alpha(th.palette.divider, th.palette.mode === "dark" ? 0.35 : 0.8),
            my: 2,
          })}
        />
        <Typography
          variant="subtitle2"
          sx={(th) => ({
            color: alpha(th.palette.primary.main, 0.95),
            fontWeight: 600,
            letterSpacing: "0.04em",
            mb: 1.5,
          })}
        >
          {t("addUser")}
        </Typography>
        <Box component="form" onSubmit={onCreate} sx={{ pt: 1 }}>
          {formErr ? (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setFormErr(null)}>
              {formErr}
            </Alert>
          ) : null}
          <Stack spacing={2}>
            <Box
              sx={{
                display: { xs: "flex", sm: "grid" },
                flexDirection: { xs: "column" },
                gap: { xs: 2, sm: 0 },
                columnGap: { sm: 2 },
                rowGap: { sm: 1 },
                gridTemplateColumns: { sm: "1fr 1fr auto" },
                gridTemplateRows: { sm: "auto auto" },
              }}
            >
              <TextField
                fullWidth
                size="small"
                label={t("newUserUsername")}
                name="new-username"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={name.length > 0 && !nameOk}
                slotProps={{
                  input: {
                    "aria-describedby": name.length > 0 && !nameOk ? USERNAME_ERROR_ID : undefined,
                  },
                }}
                sx={{ gridColumn: { sm: "1" }, gridRow: { sm: "1" }, alignSelf: { sm: "start" } }}
              />
              <Box
                sx={{
                  gridColumn: { sm: "1" },
                  gridRow: { sm: "2" },
                  minHeight: { sm: "1.25rem" },
                }}
              >
                {name.length > 0 && !nameOk ? (
                  <Typography id={USERNAME_ERROR_ID} variant="caption" color="error" role="alert" sx={{ display: "block", lineHeight: 1.4 }}>
                    {t("usernameHint")}
                  </Typography>
                ) : null}
              </Box>
              <TextField
                fullWidth
                size="small"
                type="password"
                label={t("newUserPassword")}
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ gridColumn: { sm: "2" }, gridRow: { sm: "1" }, alignSelf: { sm: "start" } }}
              />
              <Box sx={{ gridColumn: { sm: "2" }, gridRow: { sm: "2" }, minWidth: 0 }}>
                <PasswordStrengthMeter value={password} />
              </Box>
              <Button
                type="submit"
                variant="outlined"
                size="small"
                disabled={busy || !strong || !nameOk}
                sx={{
                  textTransform: "none",
                  gridColumn: { sm: "3" },
                  gridRow: { sm: "1" },
                  width: { xs: "100%", sm: "auto" },
                  alignSelf: { sm: "end" },
                }}
              >
                {t("createUser")}
              </Button>
              <Box sx={{ display: { xs: "none", sm: "block" }, gridColumn: { sm: "3" }, gridRow: { sm: "2" } }} />
            </Box>
            <FormControlLabel
              control={<Checkbox size="small" checked={asAdmin} onChange={(_, v) => setAsAdmin(v)} />}
              label={t("newUserAdmin")}
              sx={{ alignItems: "center", m: 0 }}
            />
          </Stack>
        </Box>
      </SettingsCard>
      <ConfirmModal
        open={pendingDelete != null}
        onClose={() => !deleteBusy && setPendingDelete(null)}
        onConfirm={onConfirmDelete}
        title={t("deleteUserTitle")}
        message={pendingDelete ? t("deleteUserMessage", { name: pendingDelete.username }) : ""}
        confirmLabel={tc("delete")}
        loading={deleteBusy}
      />
    </Stack>
  );
};

export default SettingsUsersCard;
