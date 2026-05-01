import { APP_CUSTOMIZATION, RESET_APP_CUSTOMIZATION, UPDATE_APP_CUSTOMIZATION } from "./settingsQueries";
import { SettingsCustomizationBanners } from "./SettingsCustomizationBanners";
import { SettingsCustomizationFavicon } from "./SettingsCustomizationFavicon";
import { SettingsCustomizationReset } from "./SettingsCustomizationReset";
import { SettingsCustomizationSiteName } from "./SettingsCustomizationSiteName";
import { postBrandingForm } from "./settingsCustomizationBrandingPost";
import { SettingsCard } from "./SettingsPrimitives";
import { useMutation, useQuery } from "@apollo/client";
import { Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SettingsCustomizationCard = () => {
  const { t } = useTranslation("settings");
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [siteNameDraft, setSiteNameDraft] = useState("");
  const [siteNameSavedHint, setSiteNameSavedHint] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDoneHint, setResetDoneHint] = useState<string | null>(null);

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
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("customizationIntro")}
      </Typography>

      <Stack spacing={2}>
        <input ref={faviconInputRef} type="file" accept=".ico,.png,.jpg,.jpeg,.webp,.image/svg+xml,.svg" hidden onChange={onFaviconFile} />
        <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg,.webp" hidden onChange={onBannerFile} />

        <SettingsCustomizationSiteName
          t={t}
          siteNameDraft={siteNameDraft}
          setSiteNameDraft={setSiteNameDraft}
          savingSiteName={savingSiteName}
          onSave={saveSiteName}
          siteNameSavedHint={siteNameSavedHint}
        />

        <SettingsCustomizationFavicon
          t={t}
          faviconUrl={faviconUrl}
          busy={busy}
          onOpenFaviconDialog={() => faviconInputRef.current?.click()}
        />

        <SettingsCustomizationBanners
          t={t}
          banners={banners}
          busy={busy}
          onOpenBannerDialog={() => bannerInputRef.current?.click()}
          onRemoveBanner={removeBanner}
        />

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
