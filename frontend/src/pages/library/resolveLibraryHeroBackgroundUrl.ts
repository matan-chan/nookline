import { libraryBuiltinHeroSources } from "./libraryBannerPublicPath";

export type LibraryHeroBackground =
  | { kind: "builtin"; webpSrcSet: string; jpegSrcSet: string; jpegFallbackSrc: string; sizes: string }
  | { kind: "remote"; url: string };

export const resolveLibraryHeroBackground = (lib: {
  bannerIndex: number;
  customLibraryBannerId?: number | null;
}): LibraryHeroBackground | null => {
  if (lib.customLibraryBannerId != null && lib.customLibraryBannerId > 0)
    return { kind: "remote", url: `/api/files/branding/library-banner/${lib.customLibraryBannerId}` };
  return { kind: "builtin", ...libraryBuiltinHeroSources(lib.bannerIndex) };
};
