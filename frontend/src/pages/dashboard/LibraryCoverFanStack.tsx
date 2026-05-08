import { BookCoverImg } from "../../components/BookCoverImg";
import { getCoverUrl } from "../../utils/cover/cover";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { DashboardLibraryPreviewBook } from "./dashboardLibraryCardTypes";

const LIBRARY_CARD_STACK_OFFSET_PX = 13;
/** Matches a full 3-cover fan so every library tile keeps the same aspect box height. */
export const LIBRARY_CARD_STACK_MAX_DEPTH = 2;
export const LIBRARY_CARD_STACK_FAN_EXTRA_PX = LIBRARY_CARD_STACK_MAX_DEPTH * LIBRARY_CARD_STACK_OFFSET_PX;

const layersForBooks = (books: DashboardLibraryPreviewBook[]) => {
  const n = Math.min(books.length, 3);
  const depthMax = LIBRARY_CARD_STACK_MAX_DEPTH;
  if (n === 1) return [{ book: books[0], depth: depthMax }];
  if (n === 2)
    return [
      { book: books[1], depth: 1 },
      { book: books[0], depth: depthMax },
    ];
  return [
    { book: books[2], depth: 0 },
    { book: books[1], depth: 1 },
    { book: books[0], depth: depthMax },
  ];
};

const layerBoxShadow = (fromBack: number) =>
  fromBack === 0
    ? `0 12px 28px ${alpha("#000000", 0.34)}, 0 4px 10px ${alpha("#000000", 0.22)}, 0 0 28px ${alpha("#ba9eff", 0.1)}, inset 0 0 0 1px ${alpha("#ffffff", 0.06)}`
    : `0 8px 20px ${alpha("#000000", 0.36)}, 0 2px 6px ${alpha("#000000", 0.2)}, inset 0 0 0 1px ${alpha("#000000", 0.18)}`;

const EmptyLibraryTile = ({ libraryName }: { libraryName: string }) => (
  <Box
    sx={(th) => ({
      display: "flex",
      height: "100%",
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: th.surfaces.high,
      px: 1,
    })}
  >
    <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
      {libraryName}
    </Typography>
  </Box>
);

const FallbackBookTile = ({ title }: { title: string }) => (
  <Box
    sx={(th) => ({
      display: "flex",
      height: "100%",
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: th.surfaces.high,
      px: 0.5,
    })}
  >
    <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontSize: "0.65rem", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
      {title}
    </Typography>
  </Box>
);

export const LibraryCoverFanStack = ({ books, libraryName }: { books: DashboardLibraryPreviewBook[]; libraryName: string }) => {
  if (books.length === 0) return <EmptyLibraryTile libraryName={libraryName} />;

  const depthMax = LIBRARY_CARD_STACK_MAX_DEPTH;
  const padLeft = depthMax * LIBRARY_CARD_STACK_OFFSET_PX;
  const layers = layersForBooks(books);

  return (
    <>
      {layers.map(({ book, depth }) => {
        const url = getCoverUrl(book);
        const z = depth + 1;
        const translateX = (depth - depthMax) * LIBRARY_CARD_STACK_OFFSET_PX;
        const fromBack = depthMax - depth;
        const rotateZ = -fromBack * 2.25;
        const translateY = fromBack * 2;
        const scale = 1 - fromBack * 0.02;
        return (
          <Box
            key={book.id}
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              left: padLeft,
              zIndex: z,
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "background.paper",
              transformOrigin: "right center",
              transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotateZ(${rotateZ}deg)`,
              boxShadow: layerBoxShadow(fromBack),
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {url ? (
              <BookCoverImg src={url} alt={book.title} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", verticalAlign: "top" }} />
            ) : (
              <FallbackBookTile title={book.title} />
            )}
          </Box>
        );
      })}
    </>
  );
};
