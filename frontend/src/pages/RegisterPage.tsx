import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import { useAuth } from "../auth/AuthContext";
import { passwordIsStrongEnough } from "../auth/passwordStrength";
import { useAppFaviconHref, useSiteDisplayName } from "../components/AppBranding";
import { useApolloClient } from "@apollo/client";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const USERNAME_RE = /^[a-zA-Z0-9_\p{L}]{2,32}$/u;

const RegisterPage = () => {
  const { t } = useTranslation("auth");
  const { register, needsFirstUser } = useAuth();
  const apollo = useApolloClient();
  const theme = useTheme();
  const nav = useNavigate();
  const siteName = useSiteDisplayName();
  const favHref = useAppFaviconHref();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strong = passwordIsStrongEnough(password);
  const usernameOk = USERNAME_RE.test(username.trim());

  useEffect(() => {
    if (!needsFirstUser) nav("/login", { replace: true });
  }, [needsFirstUser, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!strong || !usernameOk) return;
    setBusy(true);
    try {
      await register(username.trim(), password);
      await apollo.resetStore();
      nav("/", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  if (!needsFirstUser) return null;

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: (th) => th.palette.background.default,
        backgroundImage: (th) => `radial-gradient(ellipse 120% 80% at 50% -20%, ${alpha(th.palette.primary.main, 0.12)}, transparent)`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box component="img" src={favHref} alt="" sx={{ width: 40, height: 40, borderRadius: 1 }} />
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Fraunces", "Newsreader", Georgia, serif',
            fontSize: { xs: "1.5rem", sm: "1.75rem" },
            fontWeight: 600,
            color: "text.primary",
            letterSpacing: 0.02,
          }}
        >
          {siteName}
        </Typography>
      </Box>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 400,
          width: "100%",
          p: { xs: 2.5, sm: 3 },
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.75),
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, textAlign: "center" }}>
          {t("registerTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: "center" }}>
          {t("registerSubtitle")}
        </Typography>
        <form onSubmit={onSubmit}>
          {err ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
              {err}
            </Alert>
          ) : null}
          <TextField
            fullWidth
            size="small"
            label={t("username")}
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={username.length > 0 && !usernameOk}
            helperText={username.length > 0 && !usernameOk ? t("usernameHint") : " "}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            size="small"
            type="password"
            label={t("password")}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 1 }}
          />
          <PasswordStrengthMeter value={password} />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={busy || !strong || !usernameOk}
            sx={{ mt: 2, textTransform: "none", color: "#000" }}
          >
            {t("createAccount")}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
