export const getHourInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hourRaw = parts.find((p) => p.type === "hour")?.value;
  if (hourRaw == null) return date.getHours();
  const hour = parseInt(hourRaw, 10);
  return Number.isFinite(hour) ? hour : date.getHours();
};

export const getDashboardGreetingKey = (hour: number) => {
  if (hour >= 5 && hour < 12) return "greetingMorning";
  if (hour >= 12 && hour < 17) return "greetingAfternoon";
  if (hour >= 17 && hour < 22) return "greetingEvening";
  return "greetingNight";
};
