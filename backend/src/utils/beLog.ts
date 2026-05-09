import { writeSrvLog } from "./accessLog";

export const beLog = (fn: string, extra?: Record<string, unknown>) =>
  writeSrvLog({ event: "be_fn", fn, ...extra });

export const beLogErr = (fn: string, err: unknown, extra?: Record<string, unknown>) => {
  const msg = err instanceof Error ? err.message : String(err);
  writeSrvLog({ event: "be_fn_err", fn, errMsg: msg, ...extra });
};
