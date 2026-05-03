const EPUB_READING_SURFACE_STYLE_ID = "nookline-epub-reading-surface-style";

export const ensureEpubReadingSurfaceStylesInjected = (doc: Document) => {
  if (doc.getElementById(EPUB_READING_SURFACE_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = EPUB_READING_SURFACE_STYLE_ID;
  style.textContent = `
html {
  background-color: #ffffff !important;
}
body {
  background-color: #ffffff !important;
  color: #0f172a !important;
}
`;
  (doc.head ?? doc.documentElement).appendChild(style);
};
