import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "nookline-timezone";

export const getBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const isValidTimeZone = (tz: string) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const readStoredTimeZone = (): string | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v != null && isValidTimeZone(v)) return v;
    if (v != null) localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return null;
};

type TimezonePreferenceContextValue = {
  effectiveTimeZone: string;
  storedTimeZone: string | null;
  setTimeZone: (tz: string) => void;
  clearToDeviceTimeZone: () => void;
};

const TimezonePreferenceContext = createContext<TimezonePreferenceContextValue | null>(null);

export const TimezonePreferenceProvider = ({ children }: { children: ReactNode }) => {
  const [storedTimeZone, setStoredTimeZone] = useState<string | null>(() =>
    typeof window !== "undefined" ? readStoredTimeZone() : null,
  );

  const effectiveTimeZone = storedTimeZone ?? getBrowserTimeZone();

  const setTimeZone = useCallback((tz: string) => {
    if (!isValidTimeZone(tz)) return;
    setStoredTimeZone(tz);
    try {
      localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      /* ignore */
    }
  }, []);

  const clearToDeviceTimeZone = useCallback(() => {
    setStoredTimeZone(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const ctx = useMemo(
    () => ({ effectiveTimeZone, storedTimeZone, setTimeZone, clearToDeviceTimeZone }),
    [effectiveTimeZone, storedTimeZone, setTimeZone, clearToDeviceTimeZone],
  );

  return <TimezonePreferenceContext.Provider value={ctx}>{children}</TimezonePreferenceContext.Provider>;
};

export const useTimezonePreference = () => {
  const c = useContext(TimezonePreferenceContext);
  if (!c) throw new Error("useTimezonePreference must be used within TimezonePreferenceProvider");
  return c;
};
