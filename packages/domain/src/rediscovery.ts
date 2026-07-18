const DEFAULT_TIME_ZONE = "Asia/Tokyo";

export type RediscoveryDateWindow = {
  anchorDate: string;
  startDate: string;
  endDate: string;
  timeZone: string;
};

export function getAnniversaryDateWindow(
  now: Date,
  yearsAgo: number,
  requestedTimeZone = DEFAULT_TIME_ZONE,
): RediscoveryDateWindow {
  if (!Number.isInteger(yearsAgo) || yearsAgo < 1)
    throw new Error("invalid_anniversary_years");
  const timeZone = normalizeTimeZone(requestedTimeZone);
  const parts = getCalendarParts(now, timeZone);
  const targetYear = parts.year - yearsAgo;
  const targetDay = Math.min(parts.day, daysInMonth(targetYear, parts.month));
  const anchor = new Date(Date.UTC(targetYear, parts.month - 1, targetDay));

  return {
    anchorDate: toIsoDate(anchor),
    startDate: toIsoDate(addUtcDays(anchor, -3)),
    endDate: toIsoDate(addUtcDays(anchor, 4)),
    timeZone,
  };
}

function normalizeTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function getCalendarParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(value);
  const numberPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: numberPart("year"),
    month: numberPart("month"),
    day: numberPart("day"),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addUtcDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 86_400_000);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
