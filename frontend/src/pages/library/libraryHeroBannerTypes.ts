export type LibraryHeroBannerModel = {
  name: string;
  type: string;
  series: { books: { id: number }[] }[];
  books: { seriesId?: number | null }[];
};

export type LibraryHeroBannerMenu = {
  ariaLabel: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
};
