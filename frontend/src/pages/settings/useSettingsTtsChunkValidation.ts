import { DEFAULT_TTS_CHUNK_LIMITS } from "../../utils/readerText/constants";
import { parseChunkWhole } from "./settingsTtsFormHelpers";
import { useState } from "react";
import type { TFunction } from "i18next";

const CHUNK_MIN_LOWER = 20;
const CHUNK_MIN_UPPER = 4000;
const CHUNK_MAX_GAP = 10;
const CHUNK_MAX_UPPER = 50000;

export type ValidatedChunks = { chunkMinChars: number; chunkMaxChars: number; chunkPeriodExtra: number };

export const useSettingsTtsChunkValidation = (t: TFunction<"settings">) => {
  const [chunkMinDraft, setMinDraft] = useState(String(DEFAULT_TTS_CHUNK_LIMITS.minChars));
  const [chunkMaxDraft, setMaxDraft] = useState(String(DEFAULT_TTS_CHUNK_LIMITS.maxChars));
  const [chunkPeriodDraft, setPeriodDraft] = useState(String(DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra));
  const [chunkFieldsError, setChunkFieldsError] = useState<string | null>(null);

  const validateChunkDrafts = (): ValidatedChunks | null => {
    const minN = parseChunkWhole(chunkMinDraft);
    if (minN == null) {
      setChunkFieldsError(t("chunkValidationNumbers"));
      return null;
    }
    if (minN < CHUNK_MIN_LOWER || minN > CHUNK_MIN_UPPER) {
      setChunkFieldsError(t("chunkValidationMin"));
      return null;
    }
    const maxN = parseChunkWhole(chunkMaxDraft);
    if (maxN == null) {
      setChunkFieldsError(t("chunkValidationNumbers"));
      return null;
    }
    if (maxN < minN + CHUNK_MAX_GAP || maxN > CHUNK_MAX_UPPER) {
      setChunkFieldsError(t("chunkValidationMax"));
      return null;
    }
    const perN = parseChunkWhole(chunkPeriodDraft);
    if (perN == null) {
      setChunkFieldsError(t("chunkValidationNumbers"));
      return null;
    }
    if (perN > CHUNK_MAX_UPPER) {
      setChunkFieldsError(t("chunkValidationPeriod"));
      return null;
    }
    setChunkFieldsError(null);
    return { chunkMinChars: minN, chunkMaxChars: maxN, chunkPeriodExtra: perN };
  };

  const setChunkMinDraft = (v: string) => {
    setChunkFieldsError(null);
    setMinDraft(v);
  };

  const setChunkMaxDraft = (v: string) => {
    setChunkFieldsError(null);
    setMaxDraft(v);
  };

  const setChunkPeriodDraft = (v: string) => {
    setChunkFieldsError(null);
    setPeriodDraft(v);
  };

  const hydrateChunkDrafts = (s: { chunkMinChars: number; chunkMaxChars: number; chunkPeriodExtra: number }) => {
    setMinDraft(String(typeof s.chunkMinChars === "number" ? s.chunkMinChars : DEFAULT_TTS_CHUNK_LIMITS.minChars));
    setMaxDraft(String(typeof s.chunkMaxChars === "number" ? s.chunkMaxChars : DEFAULT_TTS_CHUNK_LIMITS.maxChars));
    setPeriodDraft(String(typeof s.chunkPeriodExtra === "number" ? s.chunkPeriodExtra : DEFAULT_TTS_CHUNK_LIMITS.periodScanExtra));
  };

  return {
    chunkMinDraft,
    chunkMaxDraft,
    chunkPeriodDraft,
    chunkFieldsError,
    setChunkMinDraft,
    setChunkMaxDraft,
    setChunkPeriodDraft,
    hydrateChunkDrafts,
    validateChunkDrafts,
  };
};
