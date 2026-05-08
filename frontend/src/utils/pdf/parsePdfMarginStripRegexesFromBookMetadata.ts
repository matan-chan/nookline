export const parsePdfMarginStripRegexesFromBookMetadata = (metadata: string | null | undefined): string[] => {
  if (!metadata) return [];
  try {
    const o = JSON.parse(metadata) as { pdfMarginStripRegexes?: unknown };
    const a = o.pdfMarginStripRegexes;
    if (!Array.isArray(a)) return [];
    return a.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
};
