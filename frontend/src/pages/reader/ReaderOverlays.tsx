import { ReaderBookmarkContextMenu } from "./ReaderBookmarkContextMenu";
import { ReaderBookmarkNameModal } from "./ReaderBookmarkNameModal";
import { TtsReaderPanel } from "./TtsReaderPanel";
import type { ReaderBookmarkActions } from "./useReaderBookmarkActions";
import type { TFunction } from "i18next";

type Props = {
  bookmarks: ReaderBookmarkActions;
  t: TFunction<"reader">;
  bookId: string | undefined;
  aiOpen: boolean;
  onCloseAi: () => void;
  ttsPlayback: {
    totalParas: number;
    scrollToCurrentReading: () => void;
  };
  ttsData: unknown;
  voice: string;
  setVoice: (v: string) => void;
  commitPlayback: (patch: { voice?: string; speed?: number }) => void;
  speed: number;
  setSpeed: (s: number) => void;
  voiceOptions: string[];
  bookTitle: string | null;
  readerFormat: "pdf" | "epub";
  pdfPage: number;
  pdfNumPages: number;
};

export const ReaderOverlays = ({ bookmarks, t, bookId, aiOpen, onCloseAi, ttsPlayback, ...rest }: Props) => (
  <>
    <ReaderBookmarkContextMenu
      bookmarkMenu={bookmarks.bookmarkMenu}
      onClose={bookmarks.closeBookmarkMenu}
      onSaveBookmark={bookmarks.openBookmarkNameModal}
      onPickHighlightColor={bookmarks.saveHighlightColor}
      t={t}
    />

    <ReaderBookmarkNameModal
      open={bookmarks.bookmarkModalOpen}
      bookmarkNameDraft={bookmarks.bookmarkNameDraft}
      setBookmarkNameDraft={bookmarks.setBookmarkNameDraft}
      onClose={bookmarks.closeBookmarkModal}
      onSave={bookmarks.saveNamedBookmark}
      t={t}
    />

    {bookId && (
      <TtsReaderPanel
        open={aiOpen}
        onClose={onCloseAi}
        playback={ttsPlayback}
        ttsData={rest.ttsData}
        voice={rest.voice}
        setVoice={rest.setVoice}
        commitPlayback={rest.commitPlayback}
        speed={rest.speed}
        setSpeed={rest.setSpeed}
        voiceOptions={rest.voiceOptions}
        bookTitle={rest.bookTitle}
        readerFormat={rest.readerFormat}
        pdfPage={rest.pdfPage}
        pdfNumPages={rest.pdfNumPages}
        onScrollToReading={() => ttsPlayback.scrollToCurrentReading()}
        scrollToReadingEnabled={ttsPlayback.totalParas > 0}
      />
    )}
  </>
);
