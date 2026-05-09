import type { LibraryBrowserBook, LibraryBrowserSeries, LibrarySortOption } from "./libraryBrowserTypes";

const ts = (iso: string) => {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
};

const cmpTitle = <T extends { title: string }>(a: T, b: T) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

const newestSeriesInstant = (s: LibraryBrowserSeries) => {
  const seriesTs = ts(s.createdAt);
  let maxVol = 0;
  for (const b of s.books) maxVol = Math.max(maxVol, ts(b.createdAt));
  return Math.max(seriesTs, maxVol);
};

export const sortStandaloneBooksForLibraryBrowser = (books: LibraryBrowserBook[], sort: LibrarySortOption): LibraryBrowserBook[] => {
  const copy = [...books];
  if (sort === "title") copy.sort(cmpTitle);
  else if (sort === "newest") copy.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  else
    copy.sort((a, b) => {
      const pa = a.readingProgressForUser?.percentage ?? -1;
      const pb = b.readingProgressForUser?.percentage ?? -1;
      if (pb !== pa) return pb - pa;
      return cmpTitle(a, b);
    });

  return copy;
};

export const sortSeriesForLibraryBrowser = (series: LibraryBrowserSeries[], sort: LibrarySortOption): LibraryBrowserSeries[] => {
  const copy = [...series];
  if (sort === "title") copy.sort(cmpTitle);
  else if (sort === "newest") copy.sort((a, b) => newestSeriesInstant(b) - newestSeriesInstant(a));
  else copy.sort((a, b) => a.status.localeCompare(b.status, undefined, { sensitivity: "base" }) || cmpTitle(a, b));

  return copy;
};
