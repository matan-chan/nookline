import { sanitizeDigitsOnlyInput } from "../../../../utils/input/sanitizeUserInput";
import { ChunkFieldLabel } from "./SettingsTtsCardPrimitives";
import { fieldHintSx } from "./settingsTtsCardFieldStyles";
import { Box, Stack, TextField, Typography } from "@mui/material";
import type { TFunction } from "i18next";

export const SettingsTtsCardChunkSection = ({
  t,
  chunkMinDraft,
  setChunkMinDraft,
  chunkMaxDraft,
  setChunkMaxDraft,
  chunkPeriodDraft,
  setChunkPeriodDraft,
  chunkFieldsError,
}: {
  t: TFunction<"settings">;
  chunkMinDraft: string;
  setChunkMinDraft: (v: string) => void;
  chunkMaxDraft: string;
  setChunkMaxDraft: (v: string) => void;
  chunkPeriodDraft: string;
  setChunkPeriodDraft: (v: string) => void;
  chunkFieldsError: string | null;
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em", display: "block", mb: 1 }}>
      {t("chunkSection")}
    </Typography>
    <Typography variant="caption" sx={fieldHintSx}>
      {t("chunkSectionHint")}
    </Typography>
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ pt: 0.5, alignItems: { xs: "stretch", sm: "flex-start" } }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ChunkFieldLabel label={t("chunkMin")} info={t("chunkMinInfo")} />
        <TextField
          type="text"
          inputMode="numeric"
          size="small"
          fullWidth
          value={chunkMinDraft}
          onChange={(e) => setChunkMinDraft(sanitizeDigitsOnlyInput(e.target.value))}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ChunkFieldLabel label={t("chunkMax")} info={t("chunkMaxInfo")} />
        <TextField
          type="text"
          inputMode="numeric"
          size="small"
          fullWidth
          value={chunkMaxDraft}
          onChange={(e) => setChunkMaxDraft(sanitizeDigitsOnlyInput(e.target.value))}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ChunkFieldLabel label={t("chunkPeriod")} info={t("chunkPeriodInfo")} />
        <TextField
          type="text"
          inputMode="numeric"
          size="small"
          fullWidth
          value={chunkPeriodDraft}
          onChange={(e) => setChunkPeriodDraft(sanitizeDigitsOnlyInput(e.target.value))}
        />
      </Box>
    </Stack>
    {chunkFieldsError ? (
      <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
        {chunkFieldsError}
      </Typography>
    ) : null}
  </Box>
);
