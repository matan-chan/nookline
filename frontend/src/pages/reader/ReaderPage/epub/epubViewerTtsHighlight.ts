import { TTS_READING_CLASS } from "../../../../hooks/tts/constants/ttsPlaybackConstants";

const EPUB_TTS_HIGHLIGHT_STYLE_ID = "nookline-epub-tts-highlight-style";

export const ensureEpubTtsHighlightStylesInjected = (doc: Document) => {
  if (doc.getElementById(EPUB_TTS_HIGHLIGHT_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = EPUB_TTS_HIGHLIGHT_STYLE_ID;
  style.textContent = `
.${TTS_READING_CLASS} {
  background-color: rgba(34, 197, 94, 0.38) !important;
  outline: 2px solid rgb(22, 163, 74);
  outline-offset: 1px;
  border-radius: 4px;
}
`;
  (doc.head ?? doc.documentElement).appendChild(style);
};
