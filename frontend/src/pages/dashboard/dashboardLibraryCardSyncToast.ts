export const dashboardLibrarySyncToastMessage = (
  t: (k: string, o?: Record<string, string | number>) => string,
  added: { title: string }[],
) => {
  const n = added.length;
  if (n === 0) return t("librarySyncNone");
  if (n <= 5) return t("librarySyncAddedList", { titles: added.map((b) => b.title).join(", ") });
  return t("librarySyncAddedMany", { count: n });
};
