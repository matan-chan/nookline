export type LibraryBrowserBook = {
  id: number;
  title: string;
  coverImagePath: string | null;
  metadata?: string | null;
  seriesId?: number | null;
  readingProgressForUser?: { percentage: number } | null;
};

export type LibraryBrowserSeries = {
  id: number;
  title: string;
  coverImagePath: string | null;
  metadata?: string | null;
  status: string;
  books: {
    id: number;
    coverImagePath: string | null;
    metadata?: string | null;
    volumeNumber: number | null;
    createdAt: string;
  }[];
};

export type LibraryBrowserLibrary = {
  id: number;
  name: string;
  type: string;
  path: string;
  bannerIndex: number;
  customLibraryBannerId: number | null;
  series: LibraryBrowserSeries[];
  books: LibraryBrowserBook[];
};

export type LibrarySortOption = "title" | "newest" | "status";
