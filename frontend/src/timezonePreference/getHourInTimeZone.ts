const parseHourFromParts = (date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) => {
  const parts = new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).formatToParts(date);
  const hourRaw = parts.find((p) => p.type === "hour")?.value;
  if (hourRaw == null) return null;
  let hour = parseInt(hourRaw, 10);
  if (!Number.isFinite(hour)) return null;
  if (hour === 24) hour = 0;
  return hour;
};

export const getHourInTimeZone = (date: Date, timeZone: string) => {
  try {
    const h =
      parseHourFromParts(date, timeZone, { hour: "numeric", hourCycle: "h23" }) ??
      parseHourFromParts(date, timeZone, { hour: "numeric", hour12: false });
    if (h != null) return h;
  } catch {
    /* fall through */
  }
  return date.getHours();
};

export const getDashboardGreetingKey = (hour: number) => {
  if (hour >= 5 && hour < 12) return "greetingMorning";
  if (hour >= 12 && hour < 17) return "greetingAfternoon";
  if (hour >= 17 && hour < 22) return "greetingEvening";
  return "greetingNight";
};
