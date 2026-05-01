import type { KokoroVoiceGender } from "../utils/kokoroVoiceUi";
import type { SxProps, Theme } from "@mui/material/styles";
import Woman from "@mui/icons-material/Woman";
import Man from "@mui/icons-material/Man";

type Props = { gender: KokoroVoiceGender; sx?: SxProps<Theme> };

export const KokoroGenderIcons = ({ gender, sx }: Props) => (
  <>
    {gender === "female" ? <Woman sx={sx} aria-hidden /> : null}
    {gender === "male" ? <Man sx={sx} aria-hidden /> : null}
  </>
);
