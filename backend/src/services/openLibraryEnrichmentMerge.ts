import type { EnrichmentPayload } from "./openLibraryEnrichmentTypes";
import { OL_META_VERSION, normalizeDescription } from "./openLibraryEnrichmentParse";
import { beLog } from "../utils/beLog";

export const mergeBookOpenLibrary = (existingMeta: Record<string, unknown> | null, enrichment: EnrichmentPayload) => {
  beLog("mergeBookOpenLibrary", { workKey: enrichment.workKey });
  const base = existingMeta && typeof existingMeta === "object" ? { ...existingMeta } : {};
  const prevOl = base.openLibrary && typeof base.openLibrary === "object" ? (base.openLibrary as Record<string, unknown>) : {};
  const priorDesc = normalizeDescription(base.description);
  return {
    ...base,
    openLibraryWorkKey: enrichment.workKey,
    description: enrichment.description || priorDesc,
    openLibrary: {
      ...prevOl,
      enrichedAt: enrichment.enrichedAt,
      workKey: enrichment.workKey,
      description: enrichment.description,
      subjects: enrichment.subjects,
      ratingsAverage: enrichment.ratingsAverage,
      ratingsCount: enrichment.ratingsCount,
      workTitle: enrichment.workTitle ?? null,
      sourceVersion: OL_META_VERSION,
    },
  };
};

export const mergeSeriesOpenLibrary = (existingMeta: Record<string, unknown> | null, enrichment: EnrichmentPayload) => {
  beLog("mergeSeriesOpenLibrary", { workKey: enrichment.workKey });
  const base = existingMeta && typeof existingMeta === "object" ? { ...existingMeta } : {};
  return {
    ...base,
    openLibraryWorkKey: enrichment.workKey,
    openLibrary: {
      enrichedAt: enrichment.enrichedAt,
      workKey: enrichment.workKey,
      description: enrichment.description,
      subjects: enrichment.subjects,
      ratingsAverage: enrichment.ratingsAverage,
      ratingsCount: enrichment.ratingsCount,
      workTitle: enrichment.workTitle ?? null,
      sourceVersion: OL_META_VERSION,
    },
  };
};
