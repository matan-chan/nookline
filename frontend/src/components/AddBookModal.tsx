import { enrichMetaWithSeries, searchOpenLibrary, searchOpenLibraryFuzzy, titleFromFilename, titleSearchVariants } from "./addBook/addBookModalOpenLibrary";
import { AddBookModalActions } from "./addBook/AddBookModalActions";
import { AddBookModalDropArea } from "./addBook/AddBookModalDropArea";
import { AddBookModalTitleMeta } from "./addBook/AddBookModalTitleMeta";
import type { MetaState, UploadState } from "./addBook/addBookModalTypes";
import { ADD_BOOK_CREATE_BOOK } from "./addBook/addBookMutation";
import { getStoredToken } from "../auth/authStorage";
import { useMutation } from "@apollo/client";
import { Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useState, useRef, useCallback } from "react";
import Modal from "./Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  libraryId: number;
  onCreated: () => void;
};

const AddBookModal = ({ open, onClose, libraryId, onCreated }: Props) => {
  const { t } = useTranslation("addBook");
  const { t: tc } = useTranslation("common");
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [meta, setMeta] = useState<MetaState>({ status: "idle" });
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewPdfRef = useRef<File | null>(null);

  const [createBook, { loading: saving }] = useMutation(ADD_BOOK_CREATE_BOOK, {
    onCompleted: () => {
      onCreated();
      handleReset();
      onClose();
    },
    onError: (err) => setUpload({ status: "error", message: err.message }),
  });

  const handleReset = () => {
    previewPdfRef.current = null;
    setUpload({ status: "idle" });
    setMeta({ status: "idle" });
    setTitle("");
  };

  const fetchMeta = useCallback(async (detectedTitle: string, embedded?: { embeddedTitle?: string | null; embeddedAuthor?: string | null }) => {
    setMeta({ status: "searching" });
    const trySearch = (q: string, author?: string | null, requireWhenTitleOnly?: string | null) => searchOpenLibrary(q, author, requireWhenTitleOnly).catch(() => null);

    const emb = embedded?.embeddedTitle?.trim() || null;
    const authorEmb = embedded?.embeddedAuthor?.trim() || null;
    const detected = detectedTitle.trim();

    let result = await trySearch(detected);
    if (!result && authorEmb) result = await trySearch(detected, authorEmb);
    if (!result && emb) {
      for (const variant of titleSearchVariants(emb)) {
        if (result) break;
        result = await trySearch(variant, authorEmb);
        if (!result) result = await trySearch(variant, null, authorEmb);
      }
    }
    if (!result && emb && authorEmb) result = await searchOpenLibraryFuzzy(`${emb.replace(/;/g, " ")} ${authorEmb}`, authorEmb).catch(() => null);
    if (!result && emb && authorEmb) result = await searchOpenLibraryFuzzy(emb, authorEmb).catch(() => null);
    if (!result && detected) result = await searchOpenLibraryFuzzy(detected, authorEmb).catch(() => null);
    if (!result && detected) {
      const words = detected.split(/\s+/).filter(Boolean);
      for (const n of [3, 2] as const) {
        if (words.length < n) continue;
        result = await searchOpenLibraryFuzzy(words.slice(0, n).join(" "), authorEmb).catch(() => null);
        if (result) break;
      }
    }

    if (result) {
      const data = await enrichMetaWithSeries(result);
      setMeta({ status: "found", data });
      setTitle(result.title);
    } else {
      setMeta({ status: "not_found" });
      setTitle(emb || detected);
    }
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "epub" && ext !== "pdf") {
        setUpload({ status: "error", message: t("onlyEpubPdf") });
        return;
      }

      previewPdfRef.current = ext === "pdf" ? file : null;

      setUpload({ status: "uploading", progress: 0 });
      const detected = titleFromFilename(file.name);
      setTitle(detected);

      const formData = new FormData();
      formData.append("file", file);
      const uploadUrl = `/api/files/upload?libraryId=${encodeURIComponent(String(libraryId))}`;

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUpload({ status: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText) as {
            path: string;
            filename: string;
            embeddedTitle?: string | null;
            embeddedAuthor?: string | null;
            suggestedTitle?: string | null;
          };
          const searchTitle = data.suggestedTitle?.trim() || detected;
          const pdfEmb = ext === "pdf" ? { embeddedTitle: data.embeddedTitle ?? null, embeddedAuthor: data.embeddedAuthor ?? null } : undefined;
          setUpload({
            status: "done",
            path: data.path,
            filename: file.name,
            fileExt: ext!,
            localPreviewPdf: ext === "pdf" ? file : null,
            ...(pdfEmb ?? {}),
          });
          fetchMeta(searchTitle, pdfEmb);
        } else {
          const msg = (() => {
            try {
              return JSON.parse(xhr.responseText).error;
            } catch {
              return t("uploadFailed");
            }
          })();
          setUpload({ status: "error", message: msg });
        }
      };
      xhr.onerror = () => setUpload({ status: "error", message: t("networkError") });
      xhr.open("POST", uploadUrl);
      const tok = getStoredToken();
      if (tok) xhr.setRequestHeader("Authorization", `Bearer ${tok}`);
      xhr.send(formData);
    },
    [fetchMeta, libraryId, t]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setUpload({ status: "idle" });
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleSave = () => {
    if (upload.status !== "done" || !title.trim()) return;
    if (meta.status !== "found" && meta.status !== "not_found") return;
    const metaPayload: Record<string, unknown> = { fileExt: upload.fileExt };
    if (meta.status === "found") {
      if (meta.data.author) metaPayload.author = meta.data.author;
      if (meta.data.coverUrl) metaPayload.coverUrl = meta.data.coverUrl;
      if (meta.data.year) metaPayload.year = meta.data.year;
      if (meta.data.genre) metaPayload.genre = meta.data.genre;
      if (meta.data.description) metaPayload.description = meta.data.description;
      if (meta.data.workKey) metaPayload.openLibraryWorkKey = meta.data.workKey;
      if (meta.data.isbns.length) metaPayload.isbn = meta.data.isbns;
    }
    createBook({
      variables: {
        input: {
          libraryId,
          title: title.trim(),
          filePath: upload.path,
          metadata: JSON.stringify(metaPayload),
          ...(meta.status === "found" && meta.data.seriesName ? { openLibrarySeriesName: meta.data.seriesName } : {}),
          ...(meta.status === "found" && meta.data.seriesVolume != null ? { volumeNumber: meta.data.seriesVolume } : {}),
        },
      },
    });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isDone = upload.status === "done";
  const metaReady = meta.status === "found" || meta.status === "not_found";

  return (
    <Modal open={open} onClose={handleClose} title={t("title")}>
      <Stack spacing={2.5} sx={{ minWidth: 0, overflow: "hidden" }}>
        <AddBookModalDropArea upload={upload} setUpload={setUpload} inputRef={inputRef} onFileChange={onFileChange} onDrop={onDrop} onReset={handleReset} t={t} />

        {isDone && <AddBookModalTitleMeta upload={upload} meta={meta} title={title} setTitle={setTitle} t={t} libraryId={libraryId} />}

        <AddBookModalActions upload={upload} isDone={isDone} metaReady={metaReady} titleTrimmed={Boolean(title.trim())} saving={saving} onClose={handleClose} onSave={handleSave} t={t} tc={tc} />
      </Stack>
    </Modal>
  );
};

export default AddBookModal;
