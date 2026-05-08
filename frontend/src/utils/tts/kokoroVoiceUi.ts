export type KokoroVoiceGender = "female" | "male" | null;

export const kokoroVoiceLabelAndGender = (
  voiceId: string,
  applyKokoroPrefixRules: boolean
): { label: string; gender: KokoroVoiceGender } => {
  if (!applyKokoroPrefixRules || !voiceId) return { label: voiceId, gender: null };
  if (/^af_/i.test(voiceId)) return { label: voiceId.replace(/^af_/i, ""), gender: "female" };
  if (/^am_/i.test(voiceId)) return { label: voiceId.replace(/^am_/i, ""), gender: "male" };
  return { label: voiceId, gender: null };
};
