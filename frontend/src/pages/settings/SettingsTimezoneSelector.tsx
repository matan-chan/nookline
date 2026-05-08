import { COMMON_TIMEZONES } from "../../timezonePreference/commonTimeZones";
import { Autocomplete, Box, Button, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const listSupportedTimeZones = (): string[] => {
  try {
    const intl = Intl as IntlWithSupportedValues;
    if (typeof intl.supportedValuesOf === "function") return intl.supportedValuesOf("timeZone");
  } catch {
    /* ignore */
  }
  return [...COMMON_TIMEZONES];
};

const TIMEZONE_OPTIONS = listSupportedTimeZones()
  .slice()
  .sort((a, b) => a.localeCompare(b));

type Props = {
  t: TFunction<"settings">;
  effectiveTimeZone: string;
  storedTimeZone: string | null;
  onSetTimeZone: (tz: string) => void;
  onClearTimeZone: () => void;
};

export const SettingsTimezoneSelector = ({ t, effectiveTimeZone, storedTimeZone, onSetTimeZone, onClearTimeZone }: Props) => {
  const [draft, setDraft] = useState(effectiveTimeZone);

  useEffect(() => setDraft(effectiveTimeZone), [effectiveTimeZone]);

  const choices = useMemo(() => {
    const base = TIMEZONE_OPTIONS.length > 0 ? TIMEZONE_OPTIONS : [effectiveTimeZone];
    if (base.includes(effectiveTimeZone)) return base;
    return [...base, effectiveTimeZone].sort((a, b) => a.localeCompare(b));
  }, [effectiveTimeZone]);

  const commitDraftOnBlur = () => {
    const tz = draft.trim();
    if (!tz || tz === effectiveTimeZone) return;
    onSetTimeZone(tz);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t("timezoneLabel")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
          {t("timezoneHint")}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1,
          flexShrink: 0,
          minWidth: 0,
          alignSelf: { xs: "stretch", sm: "center" },
        }}
      >
        <Autocomplete
          size="small"
          options={choices}
          value={effectiveTimeZone}
          inputValue={draft}
          freeSolo
          onChange={(_, v) => {
            if (typeof v !== "string") return;
            const tz = v.trim();
            if (!tz) return;
            setDraft(tz);
            onSetTimeZone(tz);
          }}
          onInputChange={(_, v, reason) => {
            if (reason !== "input") return;
            setDraft(v);
          }}
          onBlur={commitDraftOnBlur}
          disableClearable
          renderInput={(params) => <TextField {...params} hiddenLabel inputProps={{ ...params.inputProps, "aria-label": t("timezoneLabel") }} />}
          sx={{ width: { xs: "100%", sm: 280 }, minWidth: { sm: 220 }, maxWidth: { sm: 420 } }}
        />
        {storedTimeZone != null && (
          <Button variant="text" size="small" onClick={onClearTimeZone} sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}>
            {t("timezoneUseDevice")}
          </Button>
        )}
      </Box>
    </Box>
  );
};
