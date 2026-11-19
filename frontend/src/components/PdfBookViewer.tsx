import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./pdfBookViewer/config/configurePdfWorker";
import { Box } from "@mui/material";
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
    <Box ref={v.shellRef} sx={{ position: "relative", display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}>
      <Box
        ref={v.scrollRef}
        onScroll={v.onScroll}
        sx={{
          minHeight: 0,
          flex: 1,
          height: "100%",
          overflow: "auto",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
          "& .textLayer, & .textLayer span[role='presentation']": {
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            WebkitTapHighlightColor: "transparent",
          },
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
        readerPanelOpen={v.readerPanelOpen}
        onAiToggle={v.onAiToggle}
        onAiTap={v.onAiTap}
        onAiLongPress={v.onAiLongPress}
        ttsPlaying={v.ttsPlaying}
        ttsBusy={v.ttsBusy}
        ttsAudioRef={v.ttsAudioRef}
        trailingEnd={<PdfZoomMenu zoom={v.zoom} setZoom={v.setZoom} />}
      />
    </Box>
  );
};

export default PdfBookViewer;
