export const BUILTIN_LIBRARY_BANNER_FILES = [
  "amaze.jpg",
  "banner-01.jpg",
  "banner-03.jpg",
  "banner-11.jpg",
  "banner-14.jpg",
  "city.jpg",
  "cloud-castle.jpg",
  "custle.jpg",
  "future.jpg",
  "nature.jpg",
  "river.jpg",
  "spirit-forest.jpg",
  "storybook.jpg",
  "watcher-eye.jpg",
] as const;

export const LIBRARY_BANNER_COUNT = BUILTIN_LIBRARY_BANNER_FILES.length;

const STRIP_EXT = /\.(jpe?g|png|webp)$/i;

const normalizedBannerSlot = (bannerIndex: number) => {
  const n = Number.isFinite(bannerIndex) ? Math.trunc(bannerIndex) : 0;
  return ((n % LIBRARY_BANNER_COUNT) + LIBRARY_BANNER_COUNT) % LIBRARY_BANNER_COUNT;
};

const bannerBaseName = (bannerIndex: number) => {
  const slot = normalizedBannerSlot(bannerIndex);
  return BUILTIN_LIBRARY_BANNER_FILES[slot].replace(STRIP_EXT, "");
};

/** Small WebP for grid thumbnails (add/edit library modal). */
export const libraryBannerPickerThumbUrl = (bannerIndex: number) =>
  `/library-banners/variants/${bannerBaseName(bannerIndex)}-640.webp`;

const HERO_WIDTHS = [640, 960, 1280, 1920] as const;

export type LibraryBuiltinHeroSources = {
  webpSrcSet: string;
  jpegSrcSet: string;
  jpegFallbackSrc: string;
  sizes: string;
};

export const libraryBuiltinHeroSources = (bannerIndex: number): LibraryBuiltinHeroSources => {
  const base = bannerBaseName(bannerIndex);
  const prefix = `/library-banners/variants/${base}`;
  const webpSrcSet = HERO_WIDTHS.map((w) => `${prefix}-${w}.webp ${w}w`).join(", ");
  const jpegSrcSet = HERO_WIDTHS.map((w) => `${prefix}-${w}.jpg ${w}w`).join(", ");
  return {
    webpSrcSet,
    jpegSrcSet,
    jpegFallbackSrc: `${prefix}-1280.jpg`,
    sizes: "100vw",
  };
};
