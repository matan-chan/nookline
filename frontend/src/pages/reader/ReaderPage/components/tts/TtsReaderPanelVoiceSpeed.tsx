import { sanitizeTechnicalIdInput } from "../../../../../utils/input/sanitizeUserInput";
import { KokoroVoiceOptionLabel } from "./TtsReaderPanelParts";
import { Box, MenuItem, Select, Slider, TextField, Typography } from "@mui/material";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction<"reader">;
  mergedVoices: string[];
  selectVoiceValue: string;
  voice: string;
  setVoice: (v: string) => void;
  commitPlayback: (p: { voice?: string; speed?: number }) => void;
  isKokoroEngine: boolean;
  speed: number;
  setSpeed: (n: number) => void;
};

export const TtsReaderPanelVoiceSpeed = ({
  t,
  mergedVoices,
  selectVoiceValue,
  voice,
  setVoice,
  commitPlayback,
  isKokoroEngine,
  speed,
  setSpeed,
}: Props) => (
  <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: { xs: 0.75, sm: 1.5 }, width: "100%", minWidth: 0 }}>
    {mergedVoices.length > 0 ? (
      <Select
        size="small"
        value={selectVoiceValue}
        onChange={(e) => {
          const v = e.target.value;
          setVoice(v);
          commitPlayback({ voice: v });
        }}
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: { xs: "0.75rem", sm: undefined },
          "& .MuiSelect-select": { py: { xs: 0.5, sm: 1 }, pr: { xs: 3, sm: 4 } },
        }}
        renderValue={(v) => <KokoroVoiceOptionLabel voiceId={v} kokoro={isKokoroEngine} />}
      >
        {mergedVoices.map((v) => (
          <MenuItem key={v} value={v}>
            <KokoroVoiceOptionLabel voiceId={v} kokoro={isKokoroEngine} />
          </MenuItem>
        ))}
      </Select>
    ) : (
      <TextField
        size="small"
        placeholder={t("voiceIdPlaceholder")}
        value={voice}
        onChange={(e) => setVoice(sanitizeTechnicalIdInput(e.target.value))}
        onBlur={(e) => commitPlayback({ voice: e.target.value })}
        sx={{ flex: 1, minWidth: 0, "& .MuiInputBase-input": { py: { xs: 0.65, sm: 1 }, fontSize: { xs: "0.75rem", sm: undefined } } }}
      />
    )}
    <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.35, sm: 0.75 }, flexShrink: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, width: { xs: 32, sm: 36 }, fontSize: { xs: "0.65rem", sm: undefined } }}>
        {t("speed")}
      </Typography>
      <Slider
        size="small"
        min={0.5}
        max={2}
        step={0.1}
        value={speed}
        onChange={(_, v) => setSpeed(v as number)}
        onChangeCommitted={(_, v) => commitPlayback({ speed: v as number })}
        sx={{ width: { xs: 56, sm: 100 }, "& .MuiSlider-thumb": { width: { xs: 12, sm: 14 }, height: { xs: 12, sm: 14 } } }}
      />
      <Typography variant="caption" sx={{ width: { xs: 24, sm: 28 }, flexShrink: 0, textAlign: "right", fontSize: { xs: "0.65rem", sm: undefined } }}>
        {speed}×
      </Typography>
    </Box>
  </Box>
);
