// 1889 dates read like a dateline. Dates are UTC calendar days; never shift by time zone.
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

export const longDate = (date: string) => fmt(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const shortDate = (date: string) => fmt(date, { weekday: "short", month: "short", day: "numeric" });
export const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
export const monthDay = (date: string) => fmt(date, { month: "short", day: "numeric" });
