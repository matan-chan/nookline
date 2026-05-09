import { getStoredToken } from "../../../auth/authStorage";

export const runPostErrorPdfFileProbe = (bookId: string) => {
  const url = `/api/files/books/${bookId}`;
  const tok = getStoredToken();
  const auth = tok ? { Authorization: `Bearer ${tok}` } : undefined;
  void fetch(url, { headers: { Range: "bytes=0-15", "X-Nookline-Pdf-Probe": "1", ...auth } })
    .then(async (r) => {
      const ct = r.headers.get("content-type") ?? "";
      const looksLikeHtml = ct.includes("text/html") || ct.includes("application/json");
      const prefix = new TextDecoder().decode(await r.clone().arrayBuffer()).slice(0, 5);
      const looksLikePdfMagic = prefix.startsWith("%PDF");
      console.error("[PdfBookViewer] post-error file probe (not pdf.js primary fetch)", {
        bookId,
        url,
        status: r.status,
        contentType: ct,
        pdfMagicPrefix: looksLikePdfMagic ? prefix : prefix.replace(/\s/g, "·"),
        hint: looksLikeHtml
          ? "Response is not a PDF — your reverse proxy probably sent the SPA or an API JSON error. Forward ALL /api/* (including /api/files/) to the Nookline backend."
          : r.ok || r.status === 206
            ? looksLikePdfMagic
              ? "Range slice looks like a PDF; failure may be pdf.js worker, OOM on large file, or a proxy truncating the full download."
              : "Bytes do not start with %PDF — body may be HTML/JSON or corrupted."
            : "Non-OK status from file endpoint; check backend logs for book_file_load.",
      });
    })
    .catch((probeErr) => console.error("[PdfBookViewer] file URL probe fetch failed", { bookId, url, probeErr }));
};
