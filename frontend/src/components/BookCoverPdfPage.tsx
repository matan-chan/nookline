import { buildPdfBookFileUrl } from "./pdfBookViewer/logic/pdfBookViewerLogic";
import { coverPdfPageRenderWidth } from "../utils/pdf/coverPdfPageRenderWidth";
import "./pdfBookViewer/config/configurePdfWorker";
import { getStoredToken } from "../auth/authStorage";
import { Box, type SxProps, type Theme } from "@mui/material";
import { Document, Page } from "react-pdf";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

type Props = {
  bookId: number;
  pageWidth?: number;
  sx?: SxProps<Theme>;
  onReady?: () => void;
};

export const BookCoverPdfPage = ({ bookId, pageWidth: pageWidthMin, sx, onReady }: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [pageAspect, setPageAspect] = useState(8.5 / 11);
  const file = useMemo(() => buildPdfBookFileUrl(String(bookId)), [bookId]);
  const options = useMemo(() => {
    const tok = getStoredToken();
    if (!tok) return {};
    return { httpHeaders: { Authorization: `Bearer ${tok}` } };
  }, []);
  const onLoadError = useCallback(() => setFailed(true), []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setContainerSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderWidth = useMemo(() => {
    const fromBox = coverPdfPageRenderWidth(containerSize.w, containerSize.h, pageAspect);
    if (pageWidthMin != null) return Math.max(pageWidthMin, fromBox);
    return fromBox;
  }, [containerSize.h, containerSize.w, pageAspect, pageWidthMin]);

  const onPageLoadSuccess = useCallback(
    (page: { getViewport: (opts: { scale: number }) => { width: number; height: number } }) => {
      const vp = page.getViewport({ scale: 1 });
      setPageAspect(vp.width / vp.height);
    },
    []
  );

  if (failed)
    return (
      <Box
        sx={[
          (t) => ({ width: "100%", height: "100%", bgcolor: t.surfaces.high }),
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      />
    );

  return (
    <Box
      ref={rootRef}
      sx={[
        {
          width: "100%",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          bgcolor: "background.paper",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          lineHeight: 0,
        }}
      >
        <Document file={file} options={options} loading={null} onLoadError={onLoadError}>
          <Page
            pageNumber={1}
            width={renderWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onLoadSuccess={onPageLoadSuccess}
            onRenderSuccess={() => onReady?.()}
          />
        </Document>
      </Box>
    </Box>
  );
};