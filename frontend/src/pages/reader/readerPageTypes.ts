import type { PdfHighlightStored } from "../../utils/readerHighlightPosition";

export type EpubHighlightMenu = { cfiRange: string; text: string };

export type BookmarkMenuState =
  | {
      kind: "pdf";
      page: number;
      domIdx: number;
      mouseX: number;
      mouseY: number;
      highlight: PdfHighlightStored | null;
    }
  | { kind: "epub"; target: Node; mouseX: number; mouseY: number; highlight: EpubHighlightMenu | null };
