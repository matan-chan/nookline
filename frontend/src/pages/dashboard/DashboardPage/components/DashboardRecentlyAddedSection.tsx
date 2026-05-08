import { DashboardBookCard, type DashboardBookCover } from "../../DashboardBookCard";
import { dashboardCardGridSx } from "../../dashboardCardGrid";
import { Box, Typography } from "@mui/material";
import type { TFunction } from "i18next";

const EmptyRecentlyAdded = ({ t }: { t: TFunction<"dashboard"> }) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.5rem",
      }}
    >
      ⊞
    </Box>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      {t("emptyRecentlyAdded")}
    </Typography>
  </Box>
);

type Props = {
  t: TFunction<"dashboard">;
  recentlyAdded: DashboardBookCover[];
  onRemoveBook: (bookId: number) => void;
};

export const DashboardRecentlyAddedSection = ({ t, recentlyAdded, onRemoveBook }: Props) => (
  <Box component="section">
    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
      {t("recentlyAdded")}
    </Typography>
    {recentlyAdded.length === 0 ? (
      <EmptyRecentlyAdded t={t} />
    ) : (
      <Box sx={dashboardCardGridSx}>
        {recentlyAdded.map((book) => (
          <DashboardBookCard
            key={book.id}
            book={book}
            percentage={book.readingProgressForUser != null ? book.readingProgressForUser.percentage : undefined}
            onRemove={() => onRemoveBook(book.id)}
          />
        ))}
      </Box>
    )}
  </Box>
);
