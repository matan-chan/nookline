import type { Rendition } from "epubjs";
import { useEffect, useRef } from "react";
import { clearEpubDomHighlights } from "../playback/ttsPlaybackEpubDom";
import { useTtsEpubReadingHighlight } from "./useTtsEpubReadingHighlight";

type Args = {
  bookId: string;
  format: "epub" | "pdf";
  panelOpen: boolean;
  playing: boolean;
  navRevision: number;
  paraIndex: number;
  totalParas: number;
  stopPlayback: () => void;
  renditionRef: React.MutableRefObject<Rendition | null>;
  parasRef: React.MutableRefObject<string[]>;
  anchorRef: React.MutableRefObject<string>;
  epubHighlightElsRef: React.MutableRefObject<(HTMLElement | null)[][]>;
  pdfParaItemIndicesRef: React.MutableRefObject<number[][]>;
  pdfSessionPageRef: React.MutableRefObject<number | null>;
  epubNavSuppressRef?: React.MutableRefObject<boolean>;
  setTotalParas: (v: number) => void;
  setParaIndex: (v: number) => void;
  setPreview: (v: string) => void;
  setErr: (v: string | null) => void;
  setPdfHighlightPage: (v: number | null) => void;
  setPdfHighlightItemIndices: (v: number[]) => void;
  setPdfTextLayerTick: React.Dispatch<React.SetStateAction<number>>;
};

export const useTtsParagraphPlaybackEffects = ({
  bookId,
  format,
  panelOpen,
  playing,
  navRevision,
  paraIndex,
  totalParas,
  stopPlayback,
  renditionRef,
  parasRef,
  anchorRef,
  epubHighlightElsRef,
  pdfParaItemIndicesRef,
  pdfSessionPageRef,
  epubNavSuppressRef,
  setTotalParas,
  setParaIndex,
  setPreview,
  setErr,
  setPdfHighlightPage,
  setPdfHighlightItemIndices,
  setPdfTextLayerTick,
}: Args) => {
  useEffect(() => {
    stopPlayback();
    parasRef.current = [];
    anchorRef.current = "";
    epubHighlightElsRef.current = [];
    pdfParaItemIndicesRef.current = [];
    pdfSessionPageRef.current = null;
    setTotalParas(0);
    setParaIndex(0);
    setPreview("");
    setErr(null);
    setPdfHighlightPage(null);
    setPdfHighlightItemIndices([]);
  }, [bookId, stopPlayback]);

  useEffect(() => {
    if (!panelOpen) stopPlayback();
  }, [panelOpen, stopPlayback]);

  useEffect(() => {
    if (!panelOpen || format !== "pdf") return;
    if (!parasRef.current.length || !pdfParaItemIndicesRef.current.length) return;
    setPdfHighlightPage(pdfSessionPageRef.current);
    setPdfHighlightItemIndices(pdfParaItemIndicesRef.current[paraIndex] ?? []);
  }, [panelOpen, format, paraIndex, totalParas]);

  const prevNavRef = useRef(navRevision);
  useEffect(() => {
    if (prevNavRef.current === navRevision) return;
    prevNavRef.current = navRevision;
    stopPlayback();
    epubHighlightElsRef.current = [];
    pdfParaItemIndicesRef.current = [];
    pdfSessionPageRef.current = null;
    parasRef.current = [];
    anchorRef.current = "";
    setTotalParas(0);
    setParaIndex(0);
    setPreview("");
    setPdfHighlightPage(null);
    setPdfHighlightItemIndices([]);
    clearEpubDomHighlights(renditionRef.current);
  }, [navRevision, stopPlayback, renditionRef]);

  useTtsEpubReadingHighlight({
    format,
    panelOpen,
    playing,
    paraIndex,
    totalParas,
    navRevision,
    renditionRef,
    epubHighlightElsRef,
    epubNavSuppressRef,
    parasRef,
  });

  useEffect(() => {
    if (format !== "pdf" || !pdfParaItemIndicesRef.current.length) return;
    setPdfTextLayerTick((t) => t + 1);
  }, [format, paraIndex, totalParas, panelOpen]);

  useEffect(
    () => () => {
      stopPlayback();
    },
    [stopPlayback]
  );
};
