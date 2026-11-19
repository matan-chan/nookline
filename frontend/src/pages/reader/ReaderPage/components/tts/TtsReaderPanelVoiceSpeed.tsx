import { clampTtsSpeed, formatTtsSpeedLabel, TTS_SPEED_MAX, TTS_SPEED_MIN, TTS_SPEED_STEP } from "../../../../../hooks/tts/constants/ttsSpeed";
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.5, sm: 0.75 },
        flex: { xs: 1.15, sm: 1.3 },
        minWidth: { xs: 156, sm: 200 },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: { xs: "0.65rem", sm: undefined } }}>
        {t("speed")}
      </Typography>
      <Slider
        size="small"
        min={TTS_SPEED_MIN}
        max={TTS_SPEED_MAX}
        step={TTS_SPEED_STEP}
        value={clampTtsSpeed(speed)}
        onChange={(_, v) => setSpeed(clampTtsSpeed(v as number))}
        onChangeCommitted={(_, v) => {
          const next = clampTtsSpeed(v as number);
          setSpeed(next);
          commitPlayback({ speed: next });
        }}
        sx={{
          flex: 1,
          minWidth: { xs: 80, sm: 120 },
          mx: { xs: 0.25, sm: 0.5 },
          "& .MuiSlider-thumb": { width: { xs: 12, sm: 14 }, height: { xs: 12, sm: 14 } },
        }}
      />
      <Typography variant="caption" sx={{ width: { xs: 36, sm: 40 }, flexShrink: 0, textAlign: "right", fontSize: { xs: "0.65rem", sm: undefined } }}>
        {formatTtsSpeedLabel(speed)}×
      </Typography>
    </Box>
  </Box>
);
