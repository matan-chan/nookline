import type { TFunction } from "i18next";
import { truncateEnd } from "../utils/text/truncateEnd";

const SNACKBAR_TITLE_MAX = 42;

export const removedBookSnackbarMessage = (t: TFunction<"common">, title: string) =>
  t("removedBook", { title: truncateEnd(title, SNACKBAR_TITLE_MAX) });

export const removedSeriesSnackbarMessage = (t: TFunction<"common">, title: string) =>
  t("removedSeries", { title: truncateEnd(title, SNACKBAR_TITLE_MAX) });