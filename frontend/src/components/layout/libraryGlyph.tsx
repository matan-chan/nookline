import ChatBubbleOutlineOutlined from "@mui/icons-material/ChatBubbleOutlineOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import LocalLibraryOutlined from "@mui/icons-material/LocalLibraryOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import type { ReactNode } from "react";

export const libraryGlyph = (type: string): ReactNode => {
  if (type === "NOVEL") return <LocalLibraryOutlined fontSize="small" />;
  if (type === "MANGA") return <MenuBookOutlined fontSize="small" />;
  if (type === "COMIC") return <ChatBubbleOutlineOutlined fontSize="small" />;
  return <FolderOpenOutlined fontSize="small" />;
};
