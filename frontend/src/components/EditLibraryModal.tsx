import { useAuth } from "../auth/AuthContext";
import { dashboardHomeRefetch } from "../pages/dashboard/dashboardQueries";
import { APP_CUSTOMIZATION } from "../pages/settings/settingsQueries";
import { LIBRARIES_QUERY, type LibraryNavItem } from "./layout/layoutConstants";
import LibraryModalFormFields from "./library/LibraryModalFormFields";
import { LIBRARY_MODAL_PRIMARY_BUTTON_SX, LIBRARY_TYPES, type LibraryType } from "./library/libraryFormConstants";
import LibraryBannerPicker from "./library/LibraryBannerPicker";
import Modal from "./Modal";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Box, Button, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const UPDATE_LIBRARY = gql`
  mutation UpdateLibrary($id: Int!, $input: UpdateLibraryInput!) {
    updateLibrary(id: $id, input: $input) {
      id
      name
      type
      path
      bannerIndex
      customLibraryBannerId
    }
  }
`;

type Props = {
  open: boolean;
  library: LibraryNavItem | null;
  onClose: () => void;
  onUpdated: () => void;
};

const coerceLibraryType = (raw: string): LibraryType =>
  (LIBRARY_TYPES.includes(raw as LibraryType) ? raw : LIBRARY_TYPES[0]) as LibraryType;

const EditLibraryModal = ({ open, library, onClose, onUpdated }: Props) => {
  const { t } = useTranslation("addLibrary");
  const { t: tc } = useTranslation("common");
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [type, setType] = useState<LibraryType>(LIBRARY_TYPES[0]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [customLibraryBannerId, setCustomLibraryBannerId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: customizationData } = useQuery<{
    appCustomization: { customLibraryBanners: { id: number; url: string }[] };
  }>(APP_CUSTOMIZATION, { skip: !open });

  const customBanners = customizationData?.appCustomization?.customLibraryBanners ?? [];

  useEffect(() => {
    if (!open || !library) return;
    setName(library.name);
    setPath(library.path);
    setType(coerceLibraryType(library.type));
    setBannerIndex(Number.isFinite(library.bannerIndex) ? library.bannerIndex : 0);
    setCustomLibraryBannerId(library.customLibraryBannerId ?? null);
    setError("");
  }, [open, library]);

  const [updateLibrary, { loading }] = useMutation(UPDATE_LIBRARY, {
    refetchQueries: user ? [{ query: LIBRARIES_QUERY }, dashboardHomeRefetch(user.id)] : [{ query: LIBRARIES_QUERY }],
    awaitRefetchQueries: true,
    onCompleted: () => {
      onUpdated();
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!library) return;
    if (!name.trim() || !path.trim()) {
      setError(t("errorRequired"));
      return;
    }
    updateLibrary({
      variables: {
        id: library.id,
        input: {
          name: name.trim(),
          path: path.trim(),
          type,
          bannerIndex,
          customLibraryBannerId,
        },
      },
    });
  };

  return (
    <Modal open={open && library != null} onClose={onClose} title={t("editTitle")}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <LibraryModalFormFields
            name={name}
            path={path}
            type={type}
            onNameChange={setName}
            onPathChange={setPath}
            onTypeChange={setType}
            error={error}
          />
          <LibraryBannerPicker
            builtInLabel={t("bannerBuiltIn")}
            customLabel={t("bannerUploaded")}
            customBanners={customBanners}
            selectedBuiltinIndex={bannerIndex}
            selectedCustomId={customLibraryBannerId}
            onSelectBuiltin={(i) => {
              setCustomLibraryBannerId(null);
              setBannerIndex(i);
            }}
            onSelectCustom={setCustomLibraryBannerId}
          />
          <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
            <Button fullWidth variant="text" color="inherit" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={LIBRARY_MODAL_PRIMARY_BUTTON_SX}>
              {loading ? t("saving") : t("saveChanges")}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
};

export default EditLibraryModal;
