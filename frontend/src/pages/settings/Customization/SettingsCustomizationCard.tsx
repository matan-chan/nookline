import { useAuth } from "../../../auth/AuthContext";
import { useNooklineColorMode } from "../../../AppThemeProvider";
import { useTimezonePreference } from "../../../TimezonePreferenceProvider";
import { READER_TTS_SETTINGS } from "../../reader/readerQueries";
import { UPDATE_TTS_SETTINGS } from "../Tts/settingsQueries";
import { SettingsCustomizationBanners } from "./components/SettingsCustomizationBanners";
import { SettingsCustomizationFavicon } from "./components/SettingsCustomizationFavicon";
import { SettingsCustomizationReset } from "./components/SettingsCustomizationReset";
import { SettingsCustomizationSiteName } from "./components/SettingsCustomizationSiteName";
import { SettingsAppearanceToggle } from "./components/SettingsAppearanceToggle";
import { SettingsTimezoneSelector } from "./components/SettingsTimezoneSelector";
import { SettingsReaderDarkDocToggle } from "./components/SettingsReaderDarkDocToggle";
import { SettingsPdfToEpubToggle } from "./components/SettingsPdfToEpubToggle";
import { useAppCustomizationData } from "./hooks/useAppCustomizationData";
import { SettingsCard } from "../SettingsPrimitives";
import { useMutation } from "@apollo/client";
import { Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type SettingsCustomizationCardProps = {
  ttsData: { ttsSettings: { mode: string; readerDarkDocument: boolean } } | undefined;
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
    onCompleted: (result) => setLocalDarkDocument(result?.updateTtsSettings?.readerDarkDocument === true),
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
    void updateReaderDarkDocument({ variables: { input: { userId, mode: readerTtsMode, readerDarkDocument: checked } } });
  };

  const faviconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const cust = useAppCustomizationData(t);
  const faviconUrl = cust.data?.appCustomization?.faviconUrl ?? null;
  const banners = cust.data?.appCustomization?.customLibraryBanners ?? [];

  const onPdfToEpubChange = (_: unknown, checked: boolean) => cust.setConvertPdfToEpub(checked);

  return (
    <SettingsCard>
      <Stack spacing={2}>
        <SettingsAppearanceToggle t={t} mode={mode} onChangeMode={(v) => setMode(v as "light" | "dark")} />

        <SettingsReaderDarkDocToggle t={t} checked={readerDarkDocumentOn} disabled={userId === 0 || (ttsLoading && ttsData == null)} onChange={onReaderDarkDocumentChange} />

        <SettingsTimezoneSelector t={t} effectiveTimeZone={effectiveTimeZone} storedTimeZone={storedTimeZone} onSetTimeZone={setTimeZone} onClearTimeZone={clearToDeviceTimeZone} />

        <SettingsPdfToEpubToggle t={t} checked={cust.convertPdfToEpub} disabled={cust.savingPdfToEpub} onChange={onPdfToEpubChange} />

        <input ref={faviconInputRef} type="file" accept=".ico,.png,.jpg,.jpeg,.webp,.image/svg+xml,.svg" hidden onChange={cust.onFaviconFile} />
        <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg,.webp" hidden onChange={cust.onBannerFile} />

        <SettingsCustomizationSiteName
          t={t}
          siteNameDraft={cust.siteNameDraft}
          setSiteNameDraft={cust.setSiteNameDraft}
          savingSiteName={cust.savingSiteName}
          onSave={cust.saveSiteName}
          siteNameSavedHint={cust.siteNameSavedHint}
        />

        <SettingsCustomizationFavicon t={t} faviconUrl={faviconUrl} busy={cust.busy} onOpenFaviconDialog={() => faviconInputRef.current?.click()} />

        <SettingsCustomizationBanners t={t} banners={banners} busy={cust.busy} onOpenBannerDialog={() => bannerInputRef.current?.click()} onRemoveBanner={cust.removeBanner} />

        <SettingsCustomizationReset
          t={t}
          hasOverrides={cust.data?.appCustomization?.hasOverrides}
          busy={cust.busy}
          resettingCustomization={cust.resettingCustomization}
          resetDialogOpen={cust.resetDialogOpen}
          setResetDialogOpen={cust.setResetDialogOpen}
          onConfirmReset={() => cust.resetAppCustomization()}
          resetDoneHint={cust.resetDoneHint}
        />

        {cust.error ? (
          <Typography variant="body2" color="error">
            {cust.error}
          </Typography>
        ) : null}
      </Stack>
    </SettingsCard>
  );
};

export default SettingsCustomizationCard;
