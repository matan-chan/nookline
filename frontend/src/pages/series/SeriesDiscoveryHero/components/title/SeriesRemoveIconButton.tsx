import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { SxProps, Theme } from "@mui/material/styles";
import { IconButton, Tooltip } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  compact: boolean;
  onRemove: () => void;
  t: TFunction<"series">;
  sx?: SxProps<Theme>;
};

export const SeriesRemoveIconButton = ({ compact, onRemove, t, sx }: Props) => (
  <Tooltip title={t("removeSeries")}>
    <IconButton
      type="button"
      color="error"
      onClick={onRemove}
      aria-label={t("removeSeries")}
      size={compact ? "small" : "medium"}
      sx={{ flexShrink: 0, ...sx }}
    >
      <DeleteOutlineIcon fontSize={compact ? "small" : "medium"} />
    </IconButton>
  </Tooltip>
);
