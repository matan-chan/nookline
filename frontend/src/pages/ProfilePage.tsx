import { useAuth } from "../auth/AuthContext";
import { getStoredToken } from "../auth/authStorage";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import { passwordIsStrongEnough } from "../auth/passwordStrength";
import { useAvatarObjectUrl } from "../hooks/useAvatarObjectUrl";
import { SectionTitle, SettingsCard } from "./settings/SettingsPrimitives";
import { Box, Button, Stack, TextField, Typography, Avatar, Alert } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

const ProfilePage = () => {
  const { t } = useTranslation("profile");
  const { user, refreshUser, logout } = useAuth();
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const avatarUrl = useAvatarObjectUrl(user?.hasAvatar);

  const onPickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f || !user) return;
      setErr(null);
      setMsg(null);
      setAvatarBusy(true);
      const fd = new FormData();
      fd.append("file", f);
      const tok = getStoredToken();
      void fetch("/api/files/avatar", { method: "POST", body: fd, headers: tok ? { Authorization: `Bearer ${tok}` } : undefined })
        .then(async (r) => {
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error ?? t("uploadFailed"));
          }
          await refreshUser();
          setMsg(t("avatarUpdated"));
        })
        .catch((e) => setErr(e instanceof Error ? e.message : t("uploadFailed")))
        .finally(() => setAvatarBusy(false));
    },
    [user, refreshUser, t]
  );

  const removeAvatar = useCallback(() => {
    if (!user?.hasAvatar) return;
    setErr(null);
    setMsg(null);
    setAvatarBusy(true);
    const tok = getStoredToken();
    void fetch("/api/files/avatar", { method: "DELETE", headers: tok ? { Authorization: `Bearer ${tok}` } : undefined })
      .then(async (r) => {
        if (!r.ok) throw new Error(t("removeFailed"));
        await refreshUser();
        setMsg(t("avatarRemoved"));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : t("removeFailed")))
      .finally(() => setAvatarBusy(false));
  }, [user?.hasAvatar, refreshUser, t]);

  const onChangePassword = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !passwordIsStrongEnough(newPw)) return;
      setErr(null);
      setMsg(null);
      setPasswordBusy(true);
      const tok = getStoredToken();
      void fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      })
        .then(async (r) => {
          const j = (await r.json()) as { error?: string; ok?: boolean };
          if (!r.ok) throw new Error(j.error ?? t("passwordChangeFailed"));
          setCurPw("");
          setNewPw("");
          setMsg(t("passwordChanged"));
        })
        .catch((e) => setErr(e instanceof Error ? e.message : t("passwordChangeFailed")))
        .finally(() => setPasswordBusy(false));
    },
    [user, curPw, newPw, t]
  );

  if (user == null) return <Navigate to="/login" replace />;

  const name = user.username;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const strong = passwordIsStrongEnough(newPw);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 520, mx: "auto" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t("title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("subtitle")}
          </Typography>
        </Box>

        <Stack spacing={2}>
          <SectionTitle>{t("sectionAccount")}</SectionTitle>
          <SettingsCard>
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
              <Avatar src={avatarUrl ?? undefined} sx={{ width: 72, height: 72, fontSize: "1.5rem" }}>
                {initial}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {name}
                </Typography>
                <Typography variant="body2" color="primary.light">
                  {user.isAdmin ? t("roleAdmin") : t("roleMember")}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {t("usernameReadonly")}
                </Typography>
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden onChange={onPickFile} />
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  <Button size="small" variant="outlined" disabled={avatarBusy} onClick={() => inputRef.current?.click()} sx={{ textTransform: "none" }}>
                    {t("changePhoto")}
                  </Button>
                  {user.hasAvatar ? (
                    <Button size="small" color="inherit" disabled={avatarBusy} onClick={removeAvatar} sx={{ textTransform: "none" }}>
                      {t("removePhoto")}
                    </Button>
                  ) : null}
                </Stack>
              </Box>
            </Stack>
            {err ? <Alert severity="error">{err}</Alert> : null}
            {msg ? <Alert severity="success">{msg}</Alert> : null}
          </SettingsCard>
        </Stack>

        <Stack spacing={2}>
          <SectionTitle>{t("sectionPassword")}</SectionTitle>
          <SettingsCard>
          <Box
            component="form"
            onSubmit={onChangePassword}
          >
            <Stack spacing={1.5}>
              <TextField
                type="password"
                size="small"
                fullWidth
                autoComplete="current-password"
                label={t("currentPassword")}
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
              />
              <TextField
                type="password"
                size="small"
                fullWidth
                autoComplete="new-password"
                label={t("newPassword")}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <PasswordStrengthMeter value={newPw} />
              <Button
                type="submit"
                size="small"
                variant="contained"
                disabled={passwordBusy || !strong || !curPw}
                sx={{ alignSelf: "flex-start", textTransform: "none", color: theme.palette.mode === "light" ? "#000" : undefined }}
              >
                {passwordBusy ? t("saving") : t("savePassword")}
              </Button>
            </Stack>
          </Box>
          </SettingsCard>
        </Stack>

        <Button color="error" variant="outlined" onClick={logout} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
          {t("signOut")}
        </Button>
      </Stack>
    </Box>
  );
};

export default ProfilePage;
