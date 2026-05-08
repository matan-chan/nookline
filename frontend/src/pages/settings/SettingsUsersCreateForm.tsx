import { PasswordStrengthMeter } from "../../components/PasswordStrengthMeter";
import { passwordIsStrongEnough } from "../../auth/passwordStrength";
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import type { TFunction } from "i18next";

const USERNAME_RE = /^[a-zA-Z0-9_\p{L}]{2,32}$/u;
const USERNAME_ERROR_ID = "settings-new-username-error";

type Props = {
  t: TFunction<"auth">;
  onCreate: (payload: { username: string; password: string; isAdmin: boolean }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export const SettingsUsersCreateForm = ({ t, onCreate }: Props) => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strong = passwordIsStrongEnough(password);
  const nameOk = USERNAME_RE.test(name.trim());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    if (!strong || !nameOk) return;
    setBusy(true);
    const result = await onCreate({ username: name.trim().toLowerCase(), password, isAdmin: asAdmin });
    setBusy(false);
    if (!result.ok) {
      setFormErr(result.error);
      return;
    }
    setName("");
    setPassword("");
    setAsAdmin(false);
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ pt: 1 }}>
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
            slotProps={{ input: { "aria-describedby": name.length > 0 && !nameOk ? USERNAME_ERROR_ID : undefined } }}
            sx={{ gridColumn: { sm: "1" }, gridRow: { sm: "1" }, alignSelf: { sm: "start" } }}
          />
          <Box sx={{ gridColumn: { sm: "1" }, gridRow: { sm: "2" }, minHeight: { sm: "1.25rem" } }}>
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
            sx={{ textTransform: "none", gridColumn: { sm: "3" }, gridRow: { sm: "1" }, width: { xs: "100%", sm: "auto" }, alignSelf: { sm: "end" } }}
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
  );
};
