export type LibraryHeroBannerModel = {
  name: string;
  type: string;
  series: { books: { id: number }[] }[];
  books: { seriesId?: number | null }[];
};

export type LibraryHeroBannerMenu = {
  ariaLabel: string;
  refetchLabel: string;
  editLabel: string;
  deleteLabel: string;
  onRefetch: () => void;
  onEdit: () => void;
  onDelete: () => void;
};
