// One front-page round: six clues. The Game Master picks four text clues from a menu and orders
// them from least to most revealing; the page's picture goes fourth; the masthead (the top band
// of the page, never picked) always comes last. Picks are checked here before any Editor call.
type Box = { x: number; y: number; w: number; h: number };
export type RoundClip = { clippingId: string; segLabel: string; type?: string; text: string; hardHistory: boolean; box: Box };
export const TEXT_KINDS = ["ad", "weather", "prices", "item", "notice", "headline"] as const;
export type TextKind = (typeof TEXT_KINDS)[number];
export type Kind = TextKind | "photo" | "masthead";
export type TextPick = { i: number; kind: string; prints: string; why: string };
export type Picks = { text: TextPick[]; photo: { i: number; prints: string; why: string } };
export const TEXT_CLUES = 4;

const LABELS: Record<Kind, string> = {
  ad: "An advertisement",
  weather: "The weather report",
  prices: "Market prices",
  item: "A news item",
  notice: "A notice",
  headline: "The headline",
  photo: "A photograph",
  masthead: "The masthead",
};
// Halftone photographs reached most front pages after 1900; before, pictures were engravings.
export const clueLabel = (kind: Kind, year: number) => (kind === "photo" && year < 1900 ? "An illustration" : LABELS[kind]);

const MAX_PAGE_SHARE = 0.25;
const MUST: Partial<Record<Kind, (c: RoundClip) => string | null>> = {
  ad: (c) => (c.segLabel === "advertisement" || c.type === "ad" ? null : "is not an advertisement"),
  photo: (c) => (c.segLabel === "photograph" ? null : "is not a photograph box"),
  headline: (c) => (c.segLabel === "headline" ? null : "is not a headline box"),
};
const isText = (k: string): k is TextKind => (TEXT_KINDS as readonly string[]).includes(k);

export function validatePicks(picks: Picks, clips: RoundClip[], width: number, height: number): string[] {
  const errors: string[] = [];
  if (picks.text.length !== TEXT_CLUES) errors.push(`need ${TEXT_CLUES} text clues, got ${picks.text.length}`);
  const used = new Set<number>();
  const all = [...picks.text.map((t, n) => ({ ...t, n })), { ...picks.photo, kind: "photo", n: -1 }];
  for (const { i, kind, n } of all) {
    if (kind !== "photo" && !isText(kind)) {
      errors.push(`clue ${n + 1}: unknown kind ${kind}`);
      continue;
    }
    const c = clips[i];
    if (!c) {
      errors.push(`${kind}: no clipping ${i}`);
      continue;
    }
    if (used.has(i)) errors.push(`${kind}: clipping ${i} is already used`);
    used.add(i);
    const wrong = MUST[kind as Kind]?.(c) ?? (kind !== "photo" && c.segLabel === "photograph" ? "is a picture, not text" : null);
    if (wrong) errors.push(`${kind}: clipping ${i} ${wrong}`);
    if (c.hardHistory) errors.push(`${kind}: clipping ${i} carries a content note`);
    if ((c.box.w * c.box.h) / (width * height) > MAX_PAGE_SHARE) errors.push(`${kind}: clipping ${i} covers too much of the page`);
  }
  return errors;
}

/** The fixed running order: three text clues, the picture, the last text clue, the masthead. */
export const orderClues = <T>(text: T[], photo: T, masthead: T): T[] => [...text.slice(0, 3), photo, ...text.slice(3), masthead];

export const mastheadBox = (width: number, height: number, share = 0.12): Box => ({ x: 0, y: 0, w: width, h: Math.round(height * share) });

// The masthead clue is a band across the top of the page; it is only used when it touches no
// clipping flagged as hard history, which must never appear as a game clue.
export const bandClear = (band: Box, clips: RoundClip[]) =>
  !clips.some((c) => c.hardHistory && c.box.x < band.x + band.w && band.x < c.box.x + c.box.w && c.box.y < band.y + band.h && band.y < c.box.y + c.box.h);
