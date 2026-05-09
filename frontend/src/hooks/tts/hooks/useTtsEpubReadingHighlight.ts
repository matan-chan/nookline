import { useLayoutEffect } from "react";
import type { Rendition } from "epubjs";
import { TTS_READING_CLASS } from "../constants/ttsPlaybackConstants";
import { clearEpubDomHighlights } from "../playback/ttsPlaybackEpubDom";

type Args = {
  format: "epub" | "pdf";
  panelOpen: boolean;
  playing: boolean;
  paraIndex: number;
  totalParas: number;
  navRevision: number;
  renditionRef: React.MutableRefObject<Rendition | null>;
  epubHighlightElsRef: React.MutableRefObject<(HTMLElement | null)[][]>;
  epubNavSuppressRef?: React.MutableRefObject<boolean>;
  parasRef: React.MutableRefObject<string[]>;
};

export const useTtsEpubReadingHighlight = ({ format, panelOpen, playing, paraIndex, totalParas, navRevision, renditionRef, epubHighlightElsRef, epubNavSuppressRef, parasRef }: Args) => {
  useLayoutEffect(() => {
    if (format !== "epub") return;
    if (!panelOpen || parasRef.current.length === 0) {
      clearEpubDomHighlights(renditionRef.current);
      return;
    }
    clearEpubDomHighlights(renditionRef.current);
    const chunkEls = epubHighlightElsRef.current[paraIndex] ?? [];
    const connected = chunkEls.filter((e): e is HTMLElement => !!e?.isConnected);
    for (const el of connected) el.classList.add(TTS_READING_CLASS);
    const scrollTarget = connected[0];
    if (!scrollTarget) return;
    if (!playing) return;
    const scrollToReading = () => {
      try {
        scrollTarget.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
      } catch {
        /* ignore */
      }
    };
    const suppress = epubNavSuppressRef;
    if (!suppress) {
      scrollToReading();
      requestAnimationFrame(() => requestAnimationFrame(scrollToReading));
      return;
    }
    suppress.current = true;
    let rafInner = 0;
    let releaseT = 0;
    const rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        scrollToReading();
        releaseT = window.setTimeout(() => {
          suppress.current = false;
        }, 650);
      });
    });
    scrollToReading();
    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      if (releaseT) window.clearTimeout(releaseT);
      suppress.current = false;
    };
  }, [format, paraIndex, panelOpen, playing, navRevision, totalParas, renditionRef, epubNavSuppressRef, epubHighlightElsRef, parasRef]);
};
