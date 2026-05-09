export type DashboardLibraryPreviewBook = {
  id: number;
  title: string;
  coverImagePath: string | null;
  metadata: string | null;
};

export type DashboardLibraryPreview = {
  id: number;
  name: string;
  type: string;
  path: string;
  bannerIndex: number;
  customLibraryBannerId: number | null;
  previewBooks: DashboardLibraryPreviewBook[];
};
