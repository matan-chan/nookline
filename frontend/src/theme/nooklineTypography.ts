const fontSans = '"Inter", "Manrope", "Helvetica", "Arial", sans-serif';
const fontHeadline = '"Manrope", "Inter", "Helvetica", "Arial", sans-serif';

export const nooklineSharedTypography = {
  fontFamily: fontSans,
  h1: { fontFamily: fontHeadline, fontWeight: 800, fontSize: "1.875rem", lineHeight: 1.2, letterSpacing: "0.02em" },
  h2: { fontFamily: fontHeadline, fontWeight: 600, fontSize: "1.5rem", lineHeight: 1.25 },
  h3: { fontFamily: fontHeadline, fontWeight: 700, fontSize: "1.875rem", lineHeight: 1.2 },
  h4: { fontFamily: fontHeadline, fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.3 },
  h5: { fontFamily: fontHeadline, fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.35, letterSpacing: "0.02em" },
  h6: { fontFamily: fontHeadline, fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.35 },
  subtitle1: { fontFamily: fontSans, fontWeight: 600, fontSize: "0.875rem", lineHeight: 1.43 },
  subtitle2: { fontFamily: fontSans, fontWeight: 600, fontSize: "0.875rem", lineHeight: 1.43 },
  body1: { fontFamily: fontSans, fontSize: "0.9375rem", lineHeight: 1.5 },
  body2: { fontFamily: fontSans, fontSize: "0.875rem", lineHeight: 1.43 },
  button: { fontFamily: fontSans, textTransform: "none" as const, fontWeight: 500, fontSize: "0.875rem" },
  caption: { fontFamily: fontSans, fontSize: "0.75rem", lineHeight: 1.4 },
  overline: { fontFamily: fontSans, fontSize: "0.625rem", letterSpacing: "0.08em" },
};

export const fontSansFamily = fontSans;
