// The daily front page's rules: where a state sits, what a guess scores, and which page is today's.
import { MIDWEST_STATES } from "../game/pickMeanwhile";

export const REGIONS = ["Northeast", "South", "Midwest", "West"] as const;
export type Region = (typeof REGIONS)[number];

// U.S. Census Bureau regions.
const NORTHEAST = ["connecticut", "maine", "massachusetts", "new hampshire", "rhode island", "vermont", "new jersey", "new york", "pennsylvania"];
const SOUTH = [
  "delaware", "district of columbia", "florida", "georgia", "maryland", "north carolina", "south carolina", "virginia", "west virginia",
  "alabama", "kentucky", "mississippi", "tennessee", "arkansas", "louisiana", "oklahoma", "texas",
];
const WEST = ["arizona", "colorado", "idaho", "montana", "nevada", "new mexico", "utah", "wyoming", "alaska", "california", "hawaii", "oregon", "washington"];

export function regionOf(state: string): Region | null {
  const s = state.trim().toLowerCase();
  if (NORTHEAST.includes(s)) return "Northeast";
  if (SOUTH.includes(s)) return "South";
  if (MIDWEST_STATES.includes(s)) return "Midwest";
  if (WEST.includes(s)) return "West";
  return null;
}

const MAX_POINTS = 1000;
const CLUE_COST = 150;
const YEARS_TO_ZERO = 25;
const YEAR_WEIGHT = 0.6;

/** Points still on the table with `revealed` clues showing (the first one is free). */
export const cluePool = (revealed: number) => MAX_POINTS - CLUE_COST * Math.max(0, revealed - 1);

export function scoreGuess(g: { revealed: number; year: number; region: Region }, answer: { year: number; region: Region }) {
  const yearsOff = Math.abs(g.year - answer.year);
  const regionRight = g.region === answer.region;
  const share = YEAR_WEIGHT * Math.max(0, 1 - yearsOff / YEARS_TO_ZERO) + (1 - YEAR_WEIGHT) * (regionRight ? 1 : 0);
  return { points: Math.round(cluePool(g.revealed) * share), yearsOff, regionRight };
}

/** Front Page No. 1 went live this day (Central). */
export const LAUNCH = "2026-10-29";

const centralDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
const DAY_MS = 86_400_000;

/** Today's page number: one new page at midnight Central, cycling through `count` pages. */
export function frontPageNo(now: Date, launch: string, count: number): number {
  const days = Math.round((Date.parse(centralDay(now)) - Date.parse(launch)) / DAY_MS);
  return days < 0 ? 1 : (days % count) + 1;
}
