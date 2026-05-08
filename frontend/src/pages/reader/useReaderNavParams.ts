import { decodeReaderBookmark } from "../../utils/reader/readerBookmarkPosition";
import { highlightNavFromStartPos } from "../../utils/reader/readerHighlightPosition";
import { useEffect, useMemo } from "react";
import type { useSearchParams } from "react-router-dom";

export const useReaderNavParams = (
  bookId: string | undefined,
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
) => {
  const bmRaw = searchParams.get("bm");
  const hlRaw = searchParams.get("hl");

  const decodedBm = useMemo(() => {
    if (!bmRaw) return null;
    try {
      return decodeReaderBookmark(decodeURIComponent(bmRaw));
    } catch {
      return decodeReaderBookmark(bmRaw);
    }
  }, [bmRaw]);

  const decodedHl = useMemo(() => {
    if (!hlRaw) return null;
    let pos = hlRaw;
    try {
      pos = decodeURIComponent(hlRaw);
    } catch {
      /* keep raw */
    }
    return highlightNavFromStartPos(pos);
  }, [hlRaw]);

  useEffect(() => {
    if (!bmRaw) return;
    const id = window.setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      p.delete("bm");
      setSearchParams(p, { replace: true });
    }, 2200);
    return () => window.clearTimeout(id);
  }, [bmRaw, bookId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hlRaw) return;
    const id = window.setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      p.delete("hl");
      setSearchParams(p, { replace: true });
    }, 2200);
    return () => window.clearTimeout(id);
  }, [hlRaw, bookId, searchParams, setSearchParams]);

  return { bmRaw, hlRaw, decodedBm, decodedHl };
};
