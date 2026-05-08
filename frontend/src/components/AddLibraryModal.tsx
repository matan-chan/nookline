import { LIBRARY_BANNER_COUNT } from "../pages/library/libraryBannerPublicPath";
import { APP_CUSTOMIZATION } from "../pages/settings/Tts/settingsQueries";
import LibraryModalFormFields from "./library/LibraryModalFormFields";
import { LIBRARY_MODAL_PRIMARY_BUTTON_SX, LIBRARY_TYPES, type LibraryType } from "./library/libraryFormConstants";
import LibraryBannerPicker from "./library/LibraryBannerPicker";
import Modal from "./Modal";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Box, Button, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const CREATE_LIBRARY = gql`
  mutation CreateLibrary($input: CreateLibraryInput!) {
    createLibrary(input: $input) {
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
  onClose: () => void;
  onCreated: (library: {
    id: number;
    name: string;
    type: string;
    path: string;
    bannerIndex: number;
    customLibraryBannerId: number | null;
  }) => void;
};

const AddLibraryModal = ({ open, onClose, onCreated }: Props) => {
  const { t } = useTranslation("addLibrary");
  const { t: tc } = useTranslation("common");
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
    if (!open) return;
    setBannerIndex(Math.floor(Math.random() * LIBRARY_BANNER_COUNT));
    setCustomLibraryBannerId(null);
  }, [open]);

  const [createLibrary, { loading }] = useMutation(CREATE_LIBRARY, {
    onCompleted: (data) => {
      onCreated(data.createLibrary);
      setName("");
      setPath("");
      setType(LIBRARY_TYPES[0]);
      setError("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) {
      setError(t("errorRequired"));
      return;
    }
    const input: {
      name: string;
      path: string;
      type: string;
      bannerIndex: number;
      customLibraryBannerId?: number;
    } = { name: name.trim(), path: path.trim(), type, bannerIndex };
    if (customLibraryBannerId != null) input.customLibraryBannerId = customLibraryBannerId;
    createLibrary({ variables: { input } });
  };

  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
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
              {loading ? t("adding") : t("submit")}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
};

export default AddLibraryModal;
