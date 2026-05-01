import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import authEn from "./locales/en/auth.json";
import addBookEn from "./locales/en/addBook.json";
import addLibraryEn from "./locales/en/addLibrary.json";
import bookEn from "./locales/en/book.json";
import bookmarksEn from "./locales/en/bookmarks.json";
import cardMenuEn from "./locales/en/cardMenu.json";
import commonEn from "./locales/en/common.json";
import dashboardEn from "./locales/en/dashboard.json";
import layoutEn from "./locales/en/layout.json";
import libraryEn from "./locales/en/library.json";
import openLibraryEn from "./locales/en/openLibrary.json";
import profileEn from "./locales/en/profile.json";
import readerEn from "./locales/en/reader.json";
import seriesEn from "./locales/en/series.json";
import settingsEn from "./locales/en/settings.json";

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: [
    "auth",
    "addBook",
    "addLibrary",
    "book",
    "bookmarks",
    "cardMenu",
    "common",
    "dashboard",
    "layout",
    "library",
    "openLibrary",
    "profile",
    "reader",
    "series",
    "settings",
  ],
  interpolation: { escapeValue: false },
  resources: {
    en: {
      auth: authEn,
      addBook: addBookEn,
      addLibrary: addLibraryEn,
      book: bookEn,
      bookmarks: bookmarksEn,
      cardMenu: cardMenuEn,
      common: commonEn,
      dashboard: dashboardEn,
      layout: layoutEn,
      library: libraryEn,
      openLibrary: openLibraryEn,
      profile: profileEn,
      reader: readerEn,
      series: seriesEn,
      settings: settingsEn,
    },
  },
});

export default i18n;
