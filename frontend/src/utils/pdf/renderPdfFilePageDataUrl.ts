import "../../components/pdfBookViewer/config/configurePdfWorker";
import { pdfjs } from "react-pdf";

export const renderPdfFilePageDataUrl = async (
  file: File,
  targetWidth: number,
  coverAspect = 2 / 3
): Promise<string | null> => {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetHeight = targetWidth / coverAspect;
    const scale = Math.max(targetWidth / baseViewport.width, targetHeight / baseViewport.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: context, viewport, canvas }).promise;

    const out = document.createElement("canvas");
    out.width = Math.floor(targetWidth);
    out.height = Math.floor(targetHeight);
    const outCtx = out.getContext("2d", { alpha: false });
    if (!outCtx) return null;

    const srcAspect = canvas.width / canvas.height;
    let cropW = canvas.width;
    let cropH = canvas.height;
    let sx = 0;
    let sy = 0;
    if (srcAspect > coverAspect) {
      cropW = Math.floor(canvas.height * coverAspect);
      sx = Math.floor((canvas.width - cropW) / 2);
    } else {
      cropH = Math.floor(canvas.width / coverAspect);
      sy = Math.floor((canvas.height - cropH) / 2);
    }
    outCtx.drawImage(canvas, sx, sy, cropW, cropH, 0, 0, out.width, out.height);
    return out.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  } finally {
    await pdf.destroy();
  }
};