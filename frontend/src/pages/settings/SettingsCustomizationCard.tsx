import { useAuth } from "../../auth/AuthContext";
import { useNooklineColorMode } from "../../AppThemeProvider";
import { useTimezonePreference } from "../../TimezonePreferenceProvider";
import { COMMON_TIMEZONES } from "../../timezonePreference/commonTimeZones";
import { READER_TTS_SETTINGS } from "../reader/readerQueries";
import {
  APP_CUSTOMIZATION,
  RESET_APP_CUSTOMIZATION,
  UPDATE_APP_CUSTOMIZATION,
  UPDATE_TTS_SETTINGS,
} from "./settingsQueries";
import { SettingsCustomizationBanners } from "./SettingsCustomizationBanners";
import { SettingsCustomizationFavicon } from "./SettingsCustomizationFavicon";
import { SettingsCustomizationReset } from "./SettingsCustomizationReset";
import { SettingsCustomizationSiteName } from "./SettingsCustomizationSiteName";
import { postBrandingForm } from "./settingsCustomizationBrandingPost";
import { SettingsCard } from "./SettingsPrimitives";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { useMutation, useQuery } from "@apollo/client";
import { Autocomplete, Box, Button, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const listSupportedTimeZones = (): string[] => {
  try {
    const intl = Intl as IntlWithSupportedValues;
    if (typeof intl.supportedValuesOf === "function") return intl.supportedValuesOf("timeZone");
  } catch {
    /* ignore */
  }
  return [...COMMON_TIMEZONES];
};

const TIMEZONE_OPTIONS = listSupportedTimeZones()
  .slice()
  .sort((a, b) => a.localeCompare(b));

type SettingsCustomizationCardProps = {
  ttsData:
    | {
        ttsSettings: {
          mode: string;
          readerDarkDocument: boolean;
        };
      }
    | undefined;
  ttsLoading: boolean;
};

const SettingsCustomizationCard = ({ ttsData, ttsLoading }: SettingsCustomizationCardProps) => {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const { mode, setMode } = useNooklineColorMode();
  const { effectiveTimeZone, storedTimeZone, setTimeZone, clearToDeviceTimeZone } = useTimezonePreference();

  const [localDarkDocument, setLocalDarkDocument] = useState<boolean | null>(null);

  const [updateReaderDarkDocument] = useMutation(UPDATE_TTS_SETTINGS, {
    refetchQueries: [{ query: READER_TTS_SETTINGS, variables: { userId } }],
    onCompleted: (result) => {
      const next = result?.updateTtsSettings?.readerDarkDocument === true;
      setLocalDarkDocument(next);
    },
    onError: () => setLocalDarkDocument(null),
  });

  const serverDarkDocument = ttsData?.ttsSettings?.readerDarkDocument === true;
  const readerDarkDocumentOn = localDarkDocument ?? serverDarkDocument;
  const readerTtsMode = ttsData?.ttsSettings?.mode ?? "kokoro";

  useEffect(() => {
    if (localDarkDocument === null) return;
    if (localDarkDocument === serverDarkDocument) setLocalDarkDocument(null);
  }, [localDarkDocument, serverDarkDocument]);

  const onReaderDarkDocumentChange = (_: unknown, checked: boolean) => {
    if (userId === 0) return;
    setLocalDarkDocument(checked);
    void updateReaderDarkDocument({
      variables: { input: { userId, mode: readerTtsMode, readerDarkDocument: checked } },
    });
  };

  const faviconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [siteNameDraft, setSiteNameDraft] = useState("");
  const [siteNameSavedHint, setSiteNameSavedHint] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDoneHint, setResetDoneHint] = useState<string | null>(null);
  const [timezoneDraft, setTimezoneDraft] = useState(effectiveTimeZone);

  const timezoneChoices = useMemo(() => {
    const base = TIMEZONE_OPTIONS.length > 0 ? TIMEZONE_OPTIONS : [effectiveTimeZone];
    if (base.includes(effectiveTimeZone)) return base;
    return [...base, effectiveTimeZone].sort((a, b) => a.localeCompare(b));
  }, [effectiveTimeZone]);

  useEffect(() => setTimezoneDraft(effectiveTimeZone), [effectiveTimeZone]);

  const { data, refetch } = useQuery<{
    appCustomization: {
      siteName: string;
      hasOverrides: boolean;
      faviconUrl: string | null;
      customLibraryBanners: { id: number; url: string }[];
    };
  }>(APP_CUSTOMIZATION);

  const [updateAppCustomization, { loading: savingSiteName }] = useMutation(UPDATE_APP_CUSTOMIZATION, {
    onCompleted: () => {
      setError(null);
      void refetch();
      setSiteNameSavedHint(t("siteNameSaved"));
      setTimeout(() => setSiteNameSavedHint(null), 2500);
    },
    onError: (err) => setError(err.message),
  });

  const [resetAppCustomization, { loading: resettingCustomization }] = useMutation(RESET_APP_CUSTOMIZATION, {
    onCompleted: () => {
      setError(null);
      setResetDialogOpen(false);
      void refetch();
      setResetDoneHint(t("resetCustomizationDone"));
      setTimeout(() => setResetDoneHint(null), 3000);
    },
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    const n = data?.appCustomization?.siteName;
    if (n === undefined) return;
    setSiteNameDraft(n);
  }, [data?.appCustomization?.siteName]);

  const faviconUrl = data?.appCustomization?.faviconUrl ?? null;
  const banners = data?.appCustomization?.customLibraryBanners ?? [];

  const onFaviconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await postBrandingForm("/api/files/branding/favicon", file);
      await refetch();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await postBrandingForm("/api/files/branding/library-banner", file);
      await refetch();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const removeBanner = async (id: number) => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/files/branding/library-banner/${id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(String(r.status));
      await refetch();
    } catch {
      setError(t("deleteFailed"));
    } finally {
      setBusy(false);
    }
  };

  const saveSiteName = () => {
    setError(null);
    updateAppCustomization({ variables: { siteName: siteNameDraft } });
  };

  return (
    <SettingsCard>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "flex-start",
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          <Box sx={{ flexShrink: 0, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t("sectionAppearance")}
            </Typography>
          </Box>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_, v) => v && setMode(v)}
            sx={(th) => ({
              alignSelf: { xs: "stretch", sm: "flex-start" },
              flexShrink: 0,
              width: { xs: "100%", sm: "auto" },
              minWidth: { xs: "100%", sm: 220 },
              bgcolor: th.palette.mode === "dark" ? th.palette.common.black : alpha(th.palette.grey[500], 0.18),
              borderRadius: 9999,
              p: 0.5,
              gap: 0.5,
              "& .MuiToggleButtonGroup-grouped": {
                margin: 0,
                border: "none",
                borderRadius: `${Math.max(12, Number(th.shape.borderRadius) * 3)}px !important`,
                px: 2,
                py: 1,
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: th.palette.mode === "dark" ? alpha(th.palette.grey[400], 0.95) : alpha(th.palette.text.secondary, 0.95),
                bgcolor: "transparent",
                "&.Mui-selected": {
                  bgcolor: th.palette.mode === "dark" ? th.surfaces.high : th.palette.common.white,
                  color: th.palette.mode === "dark" ? th.palette.primary.light : th.palette.primary.main,
                  boxShadow: th.palette.mode === "light" ? `0 1px 2px ${alpha(th.palette.common.black, 0.06)}` : "none",
                  "&:hover": {
                    bgcolor: th.palette.mode === "dark" ? alpha(th.surfaces.high, 0.92) : alpha(th.palette.common.white, 0.94),
                  },
                },
                "&:hover": {
                  bgcolor: alpha(th.palette.mode === "dark" ? th.palette.common.white : th.palette.common.black, 0.06),
                },
              },
            })}
          >
            <ToggleButton value="light" disableRipple aria-label={t("themeLight")}>
              <LightModeOutlined sx={{ fontSize: 20 }} />
              {t("themeLight")}
            </ToggleButton>
            <ToggleButton value="dark" disableRipple aria-label={t("themeInky")}>
              <DarkModeOutlined sx={{ fontSize: 20 }} />
              {t("themeInky")}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t("readerDarkDocumentLabel")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {t("readerAppearanceSectionHint")} {t("readerDarkDocumentHint")}
            </Typography>
          </Box>
          <Switch
            checked={readerDarkDocumentOn}
            onChange={onReaderDarkDocumentChange}
            disabled={userId === 0 || (ttsLoading && ttsData == null)}
            inputProps={{ "aria-label": t("readerDarkDocumentLabel") }}
            sx={{ alignSelf: { xs: "flex-end", sm: "center" }, flexShrink: 0 }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t("timezoneLabel")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {t("timezoneHint")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1,
              flexShrink: 0,
              minWidth: 0,
              alignSelf: { xs: "stretch", sm: "center" },
            }}
          >
            <Autocomplete
              size="small"
              options={timezoneChoices}
              value={effectiveTimeZone}
              inputValue={timezoneDraft}
              freeSolo
              onChange={(_, v) => {
                if (typeof v !== "string") return;
                const tz = v.trim();
                if (!tz) return;
                setTimezoneDraft(tz);
                setTimeZone(tz);
              }}
              onInputChange={(_, v, reason) => {
                if (reason !== "input") return;
                setTimezoneDraft(v);
              }}
              onBlur={() => {
                const tz = timezoneDraft.trim();
                if (!tz) return;
                if (tz === effectiveTimeZone) return;
                setTimeZone(tz);
              }}
              disableClearable
              renderInput={(params) => <TextField {...params} hiddenLabel inputProps={{ ...params.inputProps, "aria-label": t("timezoneLabel") }} />}
              sx={{ width: { xs: "100%", sm: 280 }, minWidth: { sm: 220 }, maxWidth: { sm: 420 } }}
            />
            {storedTimeZone != null && (
              <Button variant="text" size="small" onClick={clearToDeviceTimeZone} sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}>
                {t("timezoneUseDevice")}
              </Button>
            )}
          </Box>
        </Box>

        <input ref={faviconInputRef} type="file" accept=".ico,.png,.jpg,.jpeg,.webp,.image/svg+xml,.svg" hidden onChange={onFaviconFile} />
        <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg,.webp" hidden onChange={onBannerFile} />

        <SettingsCustomizationSiteName t={t} siteNameDraft={siteNameDraft} setSiteNameDraft={setSiteNameDraft} savingSiteName={savingSiteName} onSave={saveSiteName} siteNameSavedHint={siteNameSavedHint} />

        <SettingsCustomizationFavicon t={t} faviconUrl={faviconUrl} busy={busy} onOpenFaviconDialog={() => faviconInputRef.current?.click()} />

        <SettingsCustomizationBanners t={t} banners={banners} busy={busy} onOpenBannerDialog={() => bannerInputRef.current?.click()} onRemoveBanner={removeBanner} />

        <SettingsCustomizationReset
          t={t}
          hasOverrides={data?.appCustomization?.hasOverrides}
          busy={busy}
          resettingCustomization={resettingCustomization}
          resetDialogOpen={resetDialogOpen}
          setResetDialogOpen={setResetDialogOpen}
          onConfirmReset={() => resetAppCustomization()}
          resetDoneHint={resetDoneHint}
        />

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}
      </Stack>
    </SettingsCard>
  );
};

export default SettingsCustomizationCard;
