import { PasswordStrengthMeter } from "../../components/PasswordStrengthMeter";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../auth/AuthContext";
import { passwordIsStrongEnough } from "../../auth/passwordStrength";
import { buildAuthHeader, getStoredToken } from "../../auth/authStorage";
import { SectionTitle, SettingsCard } from "./SettingsPrimitives";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const USERNAME_RE = /^[a-zA-Z0-9_\p{L}]{2,32}$/u;

type RowUser = { id: number; username: string; isAdmin: boolean; createdAt: string };

const SettingsUsersCard = () => {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const [rows, setRows] = useState<RowUser[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<RowUser | null>(null);
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
    const j = (await r.json()) as { users?: RowUser[] };
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
      <SectionTitle>{t("sectionUsers")}</SectionTitle>
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
          <Box component="ul" sx={{ m: 0, pl: 0, listStyle: "none" }}>
            {rows.map((row) => {
              const isSelf = user.id === row.id;
              return (
                <Box
                  key={row.id}
                  component="li"
                  sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, py: 0.5, pr: 0.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                      {row.username}
                    </Typography>
                    <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 1 }}>
                      — {row.isAdmin ? t("userRoleAdmin") : t("userRoleMember")}
                    </Typography>
                  </Box>
                  {!isSelf ? (
                    <Tooltip title={t("removeUser")}>
                      <IconButton
                        size="small"
                        aria-label={t("removeUser")}
                        onClick={() => {
                          setDeleteErr(null);
                          setPendingDelete(row);
                        }}
                        sx={{ color: "error.main" }}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        )}
        <Box component="form" onSubmit={onCreate} sx={{ pt: 1 }}>
          {formErr ? (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setFormErr(null)}>
              {formErr}
            </Alert>
          ) : null}
          <TextField
            fullWidth
            size="small"
            label={t("newUserUsername")}
            name="new-username"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={name.length > 0 && !nameOk}
            helperText={name.length > 0 && !nameOk ? t("usernameHint") : " "}
            sx={{ mb: 0.5 }}
          />
          <TextField
            fullWidth
            size="small"
            type="password"
            label={t("newUserPassword")}
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 0.5 }}
          />
          <PasswordStrengthMeter value={password} />
          <FormControlLabel
            control={<Checkbox size="small" checked={asAdmin} onChange={(_, v) => setAsAdmin(v)} />}
            label={t("newUserAdmin")}
            sx={{ alignItems: "center", my: 0.5 }}
          />
          <Button
            type="submit"
            variant="outlined"
            size="small"
            disabled={busy || !strong || !nameOk}
            sx={{ textTransform: "none" }}
          >
            {t("createUser")}
          </Button>
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
