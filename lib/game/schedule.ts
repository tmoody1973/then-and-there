// The race calendar. Day 1 = 1889-11-14 (Bly sails) = 2026-11-14 (137 years later).
// Dates are plain YYYY-MM-DD strings handled in UTC; no time-of-day logic.
const DEPARTURE_1889 = "1889-11-14";
const LAUNCH = "2026-11-14";
const DAY_MS = 86_400_000;

const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / DAY_MS);

export const dayNumberFor1889 = (date: string) => daysBetween(DEPARTURE_1889, date) + 1;
export const date1889ForDay = (day: number) => toDate(toMs(DEPARTURE_1889) + (day - 1) * DAY_MS);
export const anniversaryForDay = (day: number) => toDate(toMs(LAUNCH) + (day - 1) * DAY_MS);
export const liveDayOn = (today: string) => Math.max(0, daysBetween(LAUNCH, today) + 1);
export const isUnlocked = (day: number, today: string, demo: boolean) => demo || day <= liveDayOn(today);
