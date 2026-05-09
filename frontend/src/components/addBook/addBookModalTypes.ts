import type { OpenLibraryMeta } from "./addBookModalOpenLibrary";

export type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "uploading"; progress: number }
  | {
      status: "done";
      path: string;
      filename: string;
      fileExt: string;
      localPreviewPdf?: File | null;
      embeddedTitle?: string | null;
      embeddedAuthor?: string | null;
    }
  | { status: "error"; message: string };

export type MetaState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; data: OpenLibraryMeta }
  | { status: "not_found" };
