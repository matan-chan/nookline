import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./pdfBookViewer/config/configurePdfWorker";
import { Box, Typography } from "@mui/material";
import { PdfDocumentPagesList } from "./PdfDocumentPagesList";
import { ReaderBottomBar } from "./ReaderBottomBar";
import { PdfZoomMenu } from "./PdfZoomMenu";
import { usePdfBookViewer } from "./pdfBookViewer/hooks/usePdfBookViewer";
import type { PdfBookViewerProps } from "./pdfBookViewer/core/types";

export type { PdfBookViewerProps };

const PdfBookViewer = (props: PdfBookViewerProps) => {
  const v = usePdfBookViewer(props);
  const readerDarkDocument = props.readerDarkDocument === true;
  return (
    <Box ref={v.shellRef} sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Box
        ref={v.scrollRef}
        onScroll={v.onScroll}
        sx={{
          minHeight: 0,
          flex: 1,
          overflow: "auto",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
          ...(readerDarkDocument
            ? {
                bgcolor: "#121212",
                "& .react-pdf__Page__canvas": { filter: "invert(92%) hue-rotate(180deg)" },
              }
            : {}),
        }}
      >
        <PdfDocumentPagesList
          file={v.file}
          documentOptions={v.pdfDocumentOptions}
          numPages={v.numPages}
          layout={v.layout}
          loadError={v.loadError}
          zoom={v.zoom}
          listRenderWindow={v.listRenderWindow}
          pinnedPages={v.pinnedPages}
          ttsHighlightPage={v.ttsHighlightPage}
          ttsHighlightItemIndices={v.ttsHighlightItemIndices}
          ttsTextLayerTick={v.ttsTextLayerTick}
          pdfSavedHighlights={v.pdfSavedHighlights}
          onLoadSuccess={v.handleDocumentLoad}
          onLoadError={v.handleDocumentError}
        />
      </Box>
      <ReaderBottomBar
        backHref={v.backHref}
        aiOpen={v.aiOpen}
        onAiToggle={v.onAiToggle}
        center={
          v.numPages > 0 ? (
            <Typography component="span" variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", userSelect: "none" }}>
              {v.visiblePage} / {v.numPages}
            </Typography>
          ) : null
        }
        trailingBeforeAi={<PdfZoomMenu zoom={v.zoom} setZoom={v.setZoom} />}
      />
    </Box>
  );
};

export default PdfBookViewer;
