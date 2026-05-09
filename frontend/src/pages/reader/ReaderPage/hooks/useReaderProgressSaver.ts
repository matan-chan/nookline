import { READER_BOOK_QUERY, UPDATE_PROGRESS } from "../../readerQueries";
import { useMutation } from "@apollo/client";
import { useCallback } from "react";

type Args = { bookId: string | undefined; numericBookId: number | undefined; userId: number };

export const useReaderProgressSaver = ({ bookId, numericBookId, userId }: Args) => {
  const [updateProgress] = useMutation(UPDATE_PROGRESS, {
    refetchQueries: (res) => {
      const bid = res.data?.updateReadingProgress?.bookId;
      return bid != null ? [{ query: READER_BOOK_QUERY, variables: { id: bid, userId } }] : [];
    },
    awaitRefetchQueries: false,
  });

  return useCallback(
    (position: string, percentage: number) => {
      if (!bookId || numericBookId == null) return;
      updateProgress({ variables: { input: { userId, bookId: numericBookId, position, percentage } } });
    },
    [bookId, numericBookId, userId, updateProgress]
  );
};
