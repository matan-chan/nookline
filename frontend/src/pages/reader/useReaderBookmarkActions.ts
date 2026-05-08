import { epubParagraphIndexForDomTarget, epubResolveStartCfi, extractEpubParagraphs } from "../../utils/readerText";
import { encodeEpubBookmarkPosition, encodePdfBookmarkPosition } from "../../utils/readerBookmarkPosition";
import { encodeEpubHighlightPositions, encodePdfHighlightPositions, type PdfHighlightStored } from "../../utils/readerHighlightPosition";
import type { BookmarkMenuState, EpubHighlightMenu } from "./readerPageTypes";
import { ADD_BOOKMARK, ADD_HIGHLIGHT, READER_HIGHLIGHTS } from "./readerQueries";
import { useMutation } from "@apollo/client";
import type { Rendition } from "epubjs";
import { useCallback, useRef, useState } from "react";
import type { TFunction } from "i18next";

type ChunkLimits = { minChars: number; maxChars: number; periodScanExtra: number };

type Args = {
  bookId: string | undefined;
  numericBookId: number | undefined;
  userId: number;
  renditionRef: React.MutableRefObject<Rendition | null>;
  readerTtsChunkLimits: ChunkLimits;
  t: TFunction<"reader">;
};

export type ReaderBookmarkActions = ReturnType<typeof useReaderBookmarkActions>;

export const useReaderBookmarkActions = ({ bookId, numericBookId, userId, renditionRef, readerTtsChunkLimits, t }: Args) => {
  const [bookmarkMenu, setBookmarkMenu] = useState<BookmarkMenuState | null>(null);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [bookmarkNameDraft, setBookmarkNameDraft] = useState("");
  const bookmarkPendingRef = useRef<BookmarkMenuState | null>(null);

  const [addBookmarkMut] = useMutation(ADD_BOOKMARK);
  const [addHighlightMut] = useMutation(ADD_HIGHLIGHT, {
    refetchQueries: bookId ? [{ query: READER_HIGHLIGHTS, variables: { bookId: numericBookId ?? 0 } }] : [],
  });

  const onPdfBookmarkContext = useCallback(
    (ctx: { page: number; domIdx: number; clientX: number; clientY: number; highlight: PdfHighlightStored | null }) => {
      setBookmarkMenu({ kind: "pdf", page: ctx.page, domIdx: ctx.domIdx, mouseX: ctx.clientX, mouseY: ctx.clientY, highlight: ctx.highlight });
    },
    []
  );

  const onEpubBookmarkContext = useCallback(
    (target: Node, clientX: number, clientY: number, highlight: EpubHighlightMenu | null) => {
      setBookmarkMenu({ kind: "epub", target, mouseX: clientX, mouseY: clientY, highlight });
    },
    []
  );

  const closeBookmarkMenu = useCallback(() => setBookmarkMenu(null), []);

  const saveHighlightColor = useCallback(
    async (color: string) => {
      const m = bookmarkMenu;
      if (!m?.highlight || !bookId || numericBookId == null) return;
      const bid = numericBookId;
      setBookmarkMenu(null);
      try {
        if (m.kind === "pdf") {
          const { startPos, endPos } = encodePdfHighlightPositions(m.highlight);
          await addHighlightMut({ variables: { input: { userId, bookId: bid, startPos, endPos, text: m.highlight.t, color } } });
          return;
        }
        const { startPos, endPos } = encodeEpubHighlightPositions(m.highlight.cfiRange);
        await addHighlightMut({ variables: { input: { userId, bookId: bid, startPos, endPos, text: m.highlight.text, color } } });
      } catch {
        /* ignore */
      }
    },
    [bookmarkMenu, bookId, numericBookId, userId, addHighlightMut]
  );

  const openBookmarkNameModal = useCallback(() => {
    if (!bookmarkMenu) return;
    bookmarkPendingRef.current = bookmarkMenu;
    setBookmarkNameDraft("");
    setBookmarkModalOpen(true);
    setBookmarkMenu(null);
  }, [bookmarkMenu]);

  const resolveEpubBookmarkPosition = useCallback(
    async (target: Node) => {
      const r = renditionRef.current;
      if (!r) return null;
      const cfi = await epubResolveStartCfi(r);
      const ex = await extractEpubParagraphs(r, readerTtsChunkLimits);
      const pi = epubParagraphIndexForDomTarget(ex.highlightEls, target);
      if (pi == null || !cfi.startsWith("epubcfi(")) return null;
      return encodeEpubBookmarkPosition(cfi, pi);
    },
    [renditionRef, readerTtsChunkLimits]
  );

  const saveNamedBookmark = useCallback(async () => {
    const pending = bookmarkPendingRef.current;
    if (!bookId || !pending || numericBookId == null) return;
    const bid = numericBookId;
    let position: string | null = null;
    if (pending.kind === "pdf") position = encodePdfBookmarkPosition(pending.page, pending.domIdx);
    else position = await resolveEpubBookmarkPosition(pending.target);
    if (!position) return;
    const note = bookmarkNameDraft.trim() || t("bookmarkDefaultName");
    await addBookmarkMut({ variables: { input: { userId, bookId: bid, position, note } } });
    setBookmarkModalOpen(false);
    bookmarkPendingRef.current = null;
  }, [addBookmarkMut, bookId, numericBookId, userId, bookmarkNameDraft, resolveEpubBookmarkPosition, t]);

  const closeBookmarkModal = useCallback(() => {
    setBookmarkModalOpen(false);
    bookmarkPendingRef.current = null;
  }, []);

  return {
    bookmarkMenu,
    bookmarkModalOpen,
    bookmarkNameDraft,
    setBookmarkNameDraft,
    onPdfBookmarkContext,
    onEpubBookmarkContext,
    closeBookmarkMenu,
    saveHighlightColor,
    openBookmarkNameModal,
    saveNamedBookmark,
    closeBookmarkModal,
  };
};
