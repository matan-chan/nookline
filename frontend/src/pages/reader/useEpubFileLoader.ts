import { getStoredToken } from "../../auth/authStorage";
import { useEffect, useState } from "react";

export const useEpubFileLoader = (bookId: string) => {
  const [epubBuf, setEpubBuf] = useState<ArrayBuffer | null>(null);
  const [epubFetchErr, setEpubFetchErr] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId.trim()) return;
    let cancelled = false;
    setEpubBuf(null);
    setEpubFetchErr(null);
    void (async () => {
      try {
        const tok = getStoredToken();
        const res = await fetch(`/api/files/books/${encodeURIComponent(bookId)}`, {
          headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (!cancelled) setEpubBuf(buf);
      } catch (e) {
        if (!cancelled) setEpubFetchErr(e instanceof Error ? e.message : "Failed to load EPUB");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return { epubBuf, epubFetchErr };
};
