import {
  fetchOpenLibraryJson,
  openLibraryKeyJsonUrl,
  openLibraryWorkRatingsUrl,
} from "./openLibraryClient";
import type { EnrichmentPayload } from "./openLibraryEnrichmentTypes";
import {
  firstExcerptFromWork,
  normalizeDescription,
  normalizeSubjects,
  parseRatingsSummary,
} from "./openLibraryEnrichmentParse";
import { beLog } from "../utils/beLog";

export const loadWorkEnrichmentData = async (
  workKey: string
): Promise<{ enrichment: EnrichmentPayload; work: unknown } | null> => {
  beLog("loadWorkEnrichmentData", { workKey });
  const [work, ratingsData] = await Promise.all([
    fetchOpenLibraryJson(openLibraryKeyJsonUrl(workKey)),
    fetchOpenLibraryJson(openLibraryWorkRatingsUrl(workKey)),
  ]);
  if (!work) return null;
  const ratings = parseRatingsSummary(ratingsData);
  const fromWork = normalizeDescription(work.description) || firstExcerptFromWork(work);
  const enrichment: EnrichmentPayload = {
    enrichedAt: new Date().toISOString(),
    workKey,
    description: fromWork,
    subjects: normalizeSubjects(work.subjects),
    ratingsAverage: ratings.average,
    ratingsCount: ratings.count,
    workTitle: typeof work.title === "string" ? work.title : null,
  };
  return { enrichment, work };
};

export const editionToWorkKey = async (editionKey: string): Promise<string | null> => {
  beLog("editionToWorkKey");
  if (!editionKey.startsWith("/books/")) return null;
  const data = await fetchOpenLibraryJson(openLibraryKeyJsonUrl(editionKey));
  const w = data?.works?.[0]?.key;
  return typeof w === "string" && w.startsWith("/works/") ? w : null;
};
