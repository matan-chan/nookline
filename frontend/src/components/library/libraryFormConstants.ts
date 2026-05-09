export const LIBRARY_TYPES = ["NOVEL", "MANGA", "COMIC"] as const;
export type LibraryType = (typeof LIBRARY_TYPES)[number];

export const LIBRARY_MODAL_FORM_LABEL_SX = {
  mb: 0.75,
  fontSize: "0.7rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

export const LIBRARY_MODAL_PRIMARY_BUTTON_SX = {
  background: "linear-gradient(135deg, #ba9eff, #8455ef)",
  color: "#000",
  fontWeight: 600,
};
