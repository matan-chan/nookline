import { pdfCustomTextWrapSavedHighlights, type PdfSavedHighlightRow } from "../utils/pdf/pdfTextLayerSavedHighlightHtml";
import { usePdfTtsHighlightOverlayPaint } from "./pdf/usePdfTtsHighlightOverlayPaint";
import { TTS_PDF_ANCHOR_CLASS } from "../utils/pdf/pdfTtsHighlightOverlay";
import {
  PDF_DOCUMENT_PAGES_LIST_NO_PINNED,
  PDF_DOCUMENT_PAGES_LIST_PAD_TOP_PX,
  PDF_PAGE_GAP,
  PDF_VIEWPORT_PAD,
  pdfPageRasterWidthAndScale,
  resolvePdfRenderDevicePixelRatio,
  shouldRenderPdfListPage,
  type PdfFitViewportLayout,
  type PdfListRenderWindow,
} from "../utils/pdf/pdfPageCalc";
import { Box, CircularProgress } from "@mui/material";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Document, Page, type DocumentProps } from "react-pdf";
import { useCallback, useMemo, useState } from "react";

const escapeHtmlText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type PdfReaderPageProps = {
  pageNum: number;
  width: number;
  devicePixelRatio: number;
  customTextRenderer: (args: { pageNumber: number; itemIndex: number; str: string }) => string;
};

const PDF_PAGE_RENDER_RETRY_CAP = 3;

const ensurePdfPageCanvasVisible = (pageNum: number) => {
  requestAnimationFrame(() => {
    const root = document.querySelector(`[data-page-number="${pageNum}"]`);
    const cv = root?.querySelector("canvas");
    if (!(cv instanceof HTMLElement)) return;
    cv.style.visibility = "visible";
    cv.style.opacity = "1";
  });
};

const PdfReaderPage = ({ pageNum, width, devicePixelRatio, customTextRenderer }: PdfReaderPageProps) => {
  const [renderAttempt, setRenderAttempt] = useState(0);

  const onRenderSuccess = useCallback(() => ensurePdfPageCanvasVisible(pageNum), [pageNum]);

  const onRenderError = useCallback(() => {
    ensurePdfPageCanvasVisible(pageNum);
    setRenderAttempt((n) => (n < PDF_PAGE_RENDER_RETRY_CAP ? n + 1 : n));
  }, [pageNum]);

  return (
    <Page
      key={`${pageNum}-${renderAttempt}`}
      pageNumber={pageNum}
      width={width}
      renderTextLayer={true}
      renderAnnotationLayer={false}
      customTextRenderer={customTextRenderer}
      devicePixelRatio={devicePixelRatio}
      canvasBackground="#ffffff"
      onRenderSuccess={onRenderSuccess}
      onRenderError={onRenderError}
    />
  );
};

type Props = {
  file: { url: string };
  documentOptions?: DocumentProps["options"];
  numPages: number;
  layout: PdfFitViewportLayout | null;
  loadError: string | null;
  zoom: number;
  listRenderWindow: PdfListRenderWindow;
  pinnedPages?: number[];
  ttsHighlightPage?: number | null;
  ttsHighlightItemIndices?: number[];
  ttsTextLayerTick?: number;
  pdfSavedHighlights?: PdfSavedHighlightRow[];
  onLoadSuccess: (doc: PDFDocumentProxy) => void | Promise<void>;
  onLoadError: (error: Error) => void;
};

export const PdfDocumentPagesList = ({
  file,
  documentOptions,
  numPages,
  layout,
  loadError,
  zoom,
  listRenderWindow,
  pinnedPages,
  ttsHighlightPage = null,
  ttsHighlightItemIndices = [],
  ttsTextLayerTick = 0,
  pdfSavedHighlights = [],
  onLoadSuccess,
  onLoadError,
}: Props) => {
  const pins = pinnedPages ?? PDF_DOCUMENT_PAGES_LIST_NO_PINNED;
  const pinnedSet = useMemo(() => new Set(pins.filter((p) => p >= 1)), [pins]);
  const ttsHighlightSet = useMemo(() => new Set(ttsHighlightItemIndices), [ttsHighlightItemIndices]);
  usePdfTtsHighlightOverlayPaint(ttsHighlightPage, ttsHighlightItemIndices, ttsTextLayerTick);
  const pdfCustomTextRenderer = useCallback(
    ({ pageNumber, itemIndex, str }: { pageNumber: number; itemIndex: number; str: string }) => {
      if (ttsHighlightPage === pageNumber && ttsHighlightSet.has(itemIndex))
        return `<mark class="${TTS_PDF_ANCHOR_CLASS}">${escapeHtmlText(str)}</mark>`;
      const saved = pdfCustomTextWrapSavedHighlights(pageNumber, itemIndex, str, pdfSavedHighlights);
      if (saved) return saved;
      return str;
    },
    [ttsHighlightPage, ttsHighlightSet, ttsTextLayerTick, pdfSavedHighlights]
  );
  const waitingForDocument = numPages <= 0 && !loadError;
  const fillViewportWhileLoading = waitingForDocument;
  const renderDpr = useMemo(() => resolvePdfRenderDevicePixelRatio(), []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pl: `${PDF_VIEWPORT_PAD}px`,
        pr: `${PDF_VIEWPORT_PAD}px`,
        pt: `${PDF_DOCUMENT_PAGES_LIST_PAD_TOP_PX}px`,
        pb: 0,
        ...(fillViewportWhileLoading ? { minHeight: "100%" } : {}),
        transform: "translateZ(0)",
      }}
    >
      <Document file={file} options={documentOptions} onLoadSuccess={onLoadSuccess} onLoadError={onLoadError} loading={null}>
        {layout &&
          Array.from({ length: numPages }, (_, i) => {
            const pageNum = i + 1;
            const h = layout.heights[i] * zoom;
            if (!shouldRenderPdfListPage(pageNum, numPages, listRenderWindow, pinnedSet)) return <Box key={pageNum} sx={{ height: h, flexShrink: 0, width: "100%" }} />;
            const layoutPageW = layout.pageWidths[i];
            const layoutBodyH = layout.heights[i] - PDF_PAGE_GAP;
            const wDesired = layoutPageW * zoom;
            const bodyCssH = layoutBodyH * zoom;
            const { rasterWidth, cssScale } = pdfPageRasterWidthAndScale(wDesired, layoutPageW, layoutBodyH, renderDpr);
            return (
              <Box
                key={pageNum}
                sx={{
                  height: h,
                  display: "flex",
                  width: "100%",
                  flexShrink: 0,
                  justifyContent: "center",
                  alignItems: "flex-start",
                  overflow: "visible",
                }}
              >
                <Box sx={{ position: "relative", width: wDesired, height: bodyCssH, flexShrink: 0 }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      width: rasterWidth,
                      transform: `translateX(-50%) scale(${cssScale})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <PdfReaderPage pageNum={pageNum} width={rasterWidth} devicePixelRatio={renderDpr} customTextRenderer={pdfCustomTextRenderer} />
                  </Box>
                </Box>
              </Box>
            );
          })}
      </Document>
      {waitingForDocument && (
        <Box sx={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", py: 8, color: "text.secondary" }}>
          <CircularProgress size={28} />
        </Box>
      )}
    </Box>
  );
};
