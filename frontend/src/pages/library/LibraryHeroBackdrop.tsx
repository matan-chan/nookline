import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { LibraryHeroBackground } from "./resolveLibraryHeroBackgroundUrl";

const heroBackgroundPicture = (bg: LibraryHeroBackground) => {
  if (bg.kind === "remote")
    return (
      <Box
        component="img"
        src={bg.url}
        alt=""
        aria-hidden
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        "& picture": { display: "block", width: "100%", height: "100%" },
        "& img": { width: "100%", height: "100%", objectFit: "cover", display: "block" },
      }}
    >
      <picture>
        <source type="image/webp" srcSet={bg.webpSrcSet} sizes={bg.sizes} />
        <img src={bg.jpegFallbackSrc} srcSet={bg.jpegSrcSet} sizes={bg.sizes} alt="" aria-hidden decoding="async" />
      </picture>
    </Box>
  );
};

type Props = {
  heroBackground: LibraryHeroBackground | null;
};

export const LibraryHeroBackdrop = ({ heroBackground }: Props) => (
  <>
    {heroBackground ? (
      heroBackgroundPicture(heroBackground)
    ) : (
      <Box
        sx={(th) => ({
          position: "absolute",
          inset: 0,
          background: `linear-gradient(145deg, ${alpha(th.surfaces.high, 0.95)} 0%, ${alpha(th.surfaces.low, 1)} 45%, ${th.palette.background.default} 100%)`,
        })}
      />
    )}
    <Box
      sx={(th) => {
        const pageBg = th.palette.background.default;
        return {
          position: "absolute",
          inset: 0,
          background: [
            `linear-gradient(to top, ${th.palette.background.default} 0%, ${alpha("#000", 0.38)} 38%, transparent 68%)`,
            `linear-gradient(to left, ${th.palette.background.default} 0%, transparent 52%)`,
            `linear-gradient(to bottom, transparent 0%, transparent 52%, ${alpha(pageBg, 0.08)} 68%, ${alpha(pageBg, 0.55)} 82%, ${pageBg} 96%, ${pageBg} 100%)`,
            th.palette.mode === "dark" ? alpha(th.surfaces.container, 0.22) : alpha(th.surfaces.high, 0.35),
          ].join(","),
          pointerEvents: "none",
        };
      }}
    />
  </>
);
