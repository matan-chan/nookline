import { resolveCoverSampleUrl, sampleDominantHueFromImageUrl } from "../utils/cover/coverHueSampling";
import { coverUrlWithWidth, defaultCoverImgSrc, isApiCoverUrl } from "../utils/cover/cover";
import { useTheme, type PaletteMode, type SxProps, type Theme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";

const sampleUrlForAmbient = (coverUrl: string): string => {
  if (isApiCoverUrl(coverUrl)) return resolveCoverSampleUrl(coverUrlWithWidth(coverUrl, 128));
  return resolveCoverSampleUrl(defaultCoverImgSrc(coverUrl));
};

const ambientSxForHue = (hue: number, mode: PaletteMode, baseBg: string): SxProps<Theme> => {
  const h = Math.round(hue);
  const h2 = (h + 32) % 360;
  if (mode === "light")
    return {
      backgroundColor: baseBg,
      backgroundImage: [
        `radial-gradient(ellipse 82% 68% at 14% 16%, hsla(${h}, 52%, 58%, 0.28) 0%, transparent 58%)`,
        `radial-gradient(ellipse 65% 52% at 90% 32%, hsla(${h2}, 42%, 52%, 0.2) 0%, transparent 52%)`,
        `linear-gradient(180deg, hsla(${h}, 38%, 88%, 0.45) 0%, transparent 42%, hsla(${h}, 28%, 94%, 0.35) 100%)`,
      ].join(", "),
    };
  return {
    backgroundColor: baseBg,
    backgroundImage: [
      `radial-gradient(ellipse 88% 72% at 12% 18%, hsla(${h}, 56%, 38%, 0.38) 0%, transparent 56%)`,
      `radial-gradient(ellipse 72% 58% at 86% 36%, hsla(${h2}, 48%, 34%, 0.26) 0%, transparent 52%)`,
      `linear-gradient(180deg, hsla(${h}, 44%, 16%, 0.22) 0%, transparent 38%, hsla(${h}, 32%, 10%, 0.2) 100%)`,
    ].join(", "),
  };
};

export const useCoverAmbientBackground = (coverUrl: string | null): SxProps<Theme> => {
  const theme = useTheme();
  const [hue, setHue] = useState<number | null>(null);
  const baseBg = theme.palette.background.default;

  useEffect(() => {
    if (!coverUrl) {
      setHue(null);
      return;
    }
    let cancelled = false;
    const url = sampleUrlForAmbient(coverUrl);
    sampleDominantHueFromImageUrl(url).then((h) => {
      if (!cancelled) setHue(h);
    });
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  return useMemo(() => {
    if (hue == null)
      return {
        backgroundColor: baseBg,
      };
    return ambientSxForHue(hue, theme.palette.mode, baseBg);
  }, [hue, theme.palette.mode, baseBg]);
};
