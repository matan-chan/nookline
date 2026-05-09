import { TTS_READING_CLASS } from "../../../../hooks/tts/constants/ttsPlaybackConstants";

const EPUB_READING_SURFACE_STYLE_ID = "nookline-epub-reading-surface-style";

const lightCss = `
html {
  background-color: #ffffff !important;
}
body {
  background-color: #ffffff !important;
  color: #0f172a !important;
}
`;

const darkCss = `
html {
  background-color: #121212 !important;
}
body {
  background-color: #121212 !important;
  color: #e2e8f0 !important;
}
body *:not(img):not(svg):not(video):not(canvas):not(.${TTS_READING_CLASS}) {
  color: inherit !important;
  background-color: transparent !important;
}
a {
  color: #93c5fd !important;
}
`;

export const ensureEpubReadingSurfaceStylesInjected = (doc: Document, darkDocument: boolean) => {
  let style = doc.getElementById(EPUB_READING_SURFACE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement("style");
    style.id = EPUB_READING_SURFACE_STYLE_ID;
    (doc.head ?? doc.documentElement).appendChild(style);
  }
  style.textContent = darkDocument ? darkCss : lightCss;
};
