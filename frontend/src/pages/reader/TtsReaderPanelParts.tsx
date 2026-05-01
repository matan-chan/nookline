import { KokoroGenderIcons } from "../../components/KokoroGenderIcons";
import { kokoroVoiceLabelAndGender } from "../../utils/kokoroVoiceUi";
import { kokoroVoiceRowSx } from "./ttsReaderPanelStyles";
import { Box } from "@mui/material";

export const KokoroVoiceOptionLabel = ({ voiceId, kokoro }: { voiceId: string; kokoro: boolean }) => {
  const { label, gender } = kokoroVoiceLabelAndGender(voiceId, kokoro);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <KokoroGenderIcons gender={gender} sx={kokoroVoiceRowSx} />
      <span>{label}</span>
    </Box>
  );
};

export const StatusDot = ({ active }: { active: boolean }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      bgcolor: active ? "secondary.main" : "divider",
      animation: active ? "pulse 2s infinite" : "none",
      "@keyframes pulse": {
        "0%, 100%": { opacity: 1 },
        "50%": { opacity: 0.5 },
      },
    }}
  />
);
