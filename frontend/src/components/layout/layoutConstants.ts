import { gql } from "@apollo/client";

export const RAIL_EXPANDED = 240;
export const RAIL_COLLAPSED = 72;

export const LIBRARIES_QUERY = gql`
  query Libraries {
    libraries {
      id
      name
      type
      path
      bannerIndex
      customLibraryBannerId
    }
  }
`;

export const DELETE_LIBRARY = gql`
  mutation DeleteLibrary($id: Int!) {
    deleteLibrary(id: $id)
  }
`;

export type LibraryNavItem = {
  id: number;
  name: string;
  type: string;
  path: string;
  bannerIndex: number;
  customLibraryBannerId: number | null;
};

export type LayoutOutletContext = {
  openAddLibrary: () => void;
  setLibraryPendingDelete: (lib: LibraryNavItem | null) => void;
  openEditLibrary: (lib: LibraryNavItem) => void;
};
