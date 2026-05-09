import { postBrandingForm } from "./settingsCustomizationBrandingPost";
import { APP_CUSTOMIZATION, RESET_APP_CUSTOMIZATION, UPDATE_APP_CUSTOMIZATION, UPDATE_PDF_CONVERSION_SETTINGS } from "../../Tts/settingsQueries";
import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import type { TFunction } from "i18next";

type AppCustomization = {
  siteName: string;
  hasOverrides: boolean;
  faviconUrl: string | null;
  customLibraryBanners: { id: number; url: string }[];
  convertPdfToEpub: boolean;
};

const SITE_NAME_HINT_MS = 2500;
const RESET_HINT_MS = 3000;

export const useAppCustomizationData = (t: TFunction<"settings">) => {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [siteNameDraft, setSiteNameDraft] = useState("");
  const [siteNameSavedHint, setSiteNameSavedHint] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDoneHint, setResetDoneHint] = useState<string | null>(null);
  const [pdfToEpubLocal, setPdfToEpubLocal] = useState<boolean | null>(null);

  const { data, refetch } = useQuery<{ appCustomization: AppCustomization }>(APP_CUSTOMIZATION);

  const [updateAppCustomization, { loading: savingSiteName }] = useMutation(UPDATE_APP_CUSTOMIZATION, {
    onCompleted: () => {
      setError(null);
      void refetch();
      setSiteNameSavedHint(t("siteNameSaved"));
      setTimeout(() => setSiteNameSavedHint(null), SITE_NAME_HINT_MS);
    },
    onError: (err) => setError(err.message),
  });

  const [resetAppCustomization, { loading: resettingCustomization }] = useMutation(RESET_APP_CUSTOMIZATION, {
    onCompleted: () => {
      setError(null);
      setResetDialogOpen(false);
      void refetch();
      setResetDoneHint(t("resetCustomizationDone"));
      setTimeout(() => setResetDoneHint(null), RESET_HINT_MS);
    },
    onError: (err) => setError(err.message),
  });

  const [updatePdfConversionSettings, { loading: savingPdfToEpub }] = useMutation(UPDATE_PDF_CONVERSION_SETTINGS, {
    onCompleted: (d) => {
      setError(null);
      const v = d?.updatePdfConversionSettings?.convertPdfToEpub;
      if (typeof v === "boolean") setPdfToEpubLocal(v);
      void refetch();
    },
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    const n = data?.appCustomization?.siteName;
    if (n === undefined) return;
    setSiteNameDraft(n);
  }, [data?.appCustomization?.siteName]);

  useEffect(() => {
    const v = data?.appCustomization?.convertPdfToEpub;
    if (typeof v !== "boolean") return;
    if (pdfToEpubLocal === null) setPdfToEpubLocal(v);
    else if (pdfToEpubLocal === v) return;
  }, [data?.appCustomization?.convertPdfToEpub, pdfToEpubLocal]);

  const uploadAndRefetch = async (url: string, file: File, failKey: "uploadFailed" | "deleteFailed") => {
    setError(null);
    setBusy(true);
    try {
      await postBrandingForm(url, file);
      await refetch();
    } catch {
      setError(t(failKey));
    } finally {
      setBusy(false);
    }
  };

  const onFaviconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadAndRefetch("/api/files/branding/favicon", file, "uploadFailed");
  };

  const onBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadAndRefetch("/api/files/branding/library-banner", file, "uploadFailed");
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

  const setConvertPdfToEpub = (next: boolean) => {
    setError(null);
    setPdfToEpubLocal(next);
    updatePdfConversionSettings({ variables: { convertPdfToEpub: next } });
  };

  return {
    data,
    error,
    busy,
    siteNameDraft,
    setSiteNameDraft,
    savingSiteName,
    siteNameSavedHint,
    resetDialogOpen,
    setResetDialogOpen,
    resetDoneHint,
    resettingCustomization,
    saveSiteName,
    onFaviconFile,
    onBannerFile,
    removeBanner,
    resetAppCustomization,
    convertPdfToEpub: pdfToEpubLocal ?? data?.appCustomization?.convertPdfToEpub ?? false,
    savingPdfToEpub,
    setConvertPdfToEpub,
  };
};
