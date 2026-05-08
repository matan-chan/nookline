import type { Rendition } from "epubjs";
import { TTS_READING_CLASS } from "../constants/ttsPlaybackConstants";

export const clearEpubDomHighlights = (rendition: Rendition | null) => {
  if (!rendition) return;
  const raw = rendition.getContents() as { document: Document } | { document: Document }[];
  const list = Array.isArray(raw) ? raw : [raw];
  for (const c of list) c.document?.querySelectorAll(`.${TTS_READING_CLASS}`).forEach((el) => el.classList.remove(TTS_READING_CLASS));
};
