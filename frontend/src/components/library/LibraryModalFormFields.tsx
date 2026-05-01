import { sanitizeLettersDigitsAndWhitespace, sanitizePathInput } from "../../utils/sanitizeUserInput";
import { FormControl, FormLabel, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { LIBRARY_MODAL_FORM_LABEL_SX, LIBRARY_TYPES, type LibraryType } from "./libraryFormConstants";

type Props = {
  name: string;
  path: string;
  type: LibraryType;
  onNameChange: (value: string) => void;
  onPathChange: (value: string) => void;
  onTypeChange: (value: LibraryType) => void;
  error: string;
};

const LibraryModalFormFields = ({ name, path, type, onNameChange, onPathChange, onTypeChange, error }: Props) => {
  const { t } = useTranslation("addLibrary");

  return (
    <>
      <FormControl fullWidth>
        <FormLabel sx={LIBRARY_MODAL_FORM_LABEL_SX}>{t("nameLabel")}</FormLabel>
        <TextField
          autoFocus
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => onNameChange(sanitizeLettersDigitsAndWhitespace(e.target.value))}
          size="small"
          fullWidth
        />
      </FormControl>

      <FormControl fullWidth>
        <FormLabel sx={LIBRARY_MODAL_FORM_LABEL_SX}>{t("pathLabel")}</FormLabel>
        <TextField
          placeholder={t("pathPlaceholder")}
          value={path}
          onChange={(e) => onPathChange(sanitizePathInput(e.target.value))}
          size="small"
          fullWidth
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
          {t("pathHint")}
        </Typography>
      </FormControl>

      <FormControl fullWidth>
        <FormLabel sx={LIBRARY_MODAL_FORM_LABEL_SX}>{t("typeLabel")}</FormLabel>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={type}
          onChange={(_, v: LibraryType | null) => {
            if (v) onTypeChange(v);
          }}
          size="small"
        >
          {LIBRARY_TYPES.map((lt) => (
            <ToggleButton key={lt} value={lt} sx={{ fontSize: "0.7rem", textTransform: "none" }}>
              {lt}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </FormControl>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </>
  );
};

export default LibraryModalFormFields;
