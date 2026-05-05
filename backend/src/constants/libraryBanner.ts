export const LIBRARY_BANNER_COUNT = 14;

export const randomLibraryBannerIndex = () => Math.floor(Math.random() * LIBRARY_BANNER_COUNT);

export const normalizeLibraryBannerIndex = (n: unknown): number | null => {
  if (n === undefined || n === null) return null;
  const t = Math.trunc(Number(n));
  if (!Number.isFinite(t)) return null;
  return ((t % LIBRARY_BANNER_COUNT) + LIBRARY_BANNER_COUNT) % LIBRARY_BANNER_COUNT;
};
