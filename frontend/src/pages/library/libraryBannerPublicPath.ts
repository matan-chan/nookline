import { LIBRARY_BANNER_HERO_WIDTHS } from "./libraryBannerVariants.generated";

export const BUILTIN_LIBRARY_BANNER_FILES = [
  "amaze.jpg",
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

export type LibraryBuiltinHeroSources = {
  webpSrcSet: string;
  jpegSrcSet: string;
  jpegFallbackSrc: string;
  sizes: string;
};

export const libraryBuiltinHeroSources = (bannerIndex: number): LibraryBuiltinHeroSources => {
  const base = bannerBaseName(bannerIndex);
  const widths = [...LIBRARY_BANNER_HERO_WIDTHS[base as keyof typeof LIBRARY_BANNER_HERO_WIDTHS]];
  const prefix = `/library-banners/variants/${base}`;
  const webpSrcSet = widths.map((w) => `${prefix}-${w}.webp ${w}w`).join(", ");
  const jpegSrcSet = widths.map((w) => `${prefix}-${w}.jpg ${w}w`).join(", ");
  const max = widths[widths.length - 1];
  return {
    webpSrcSet,
    jpegSrcSet,
    jpegFallbackSrc: `${prefix}-${max}.jpg`,
    sizes: "100vw",
  };
};
