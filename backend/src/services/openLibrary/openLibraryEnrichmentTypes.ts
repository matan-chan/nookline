export type EnrichmentPayload = {
  enrichedAt: string;
  workKey: string;
  description: string | null;
  subjects: string[];
  ratingsAverage: number | null;
  ratingsCount: number | null;
  workTitle?: string | null;
};
