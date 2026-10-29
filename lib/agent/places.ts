// Places a reader can follow: the Midwest states and the three anchor cities (spec 5).
import { MIDWEST_STATES } from "../game/pickMeanwhile";

export const ANCHOR_CITIES = ["milwaukee", "chicago", "detroit"];
export const PLACES = [...MIDWEST_STATES, ...ANCHOR_CITIES];

export function normalizePlace(value: string): string | null {
  const v = value.trim().toLowerCase();
  return PLACES.includes(v) ? v : null;
}
