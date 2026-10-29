// Spot the Forgery: one ad on a real 1889 page is redrawn by Muse Image as something that
// couldn't exist yet. These rules pick the ad, the decoys and the planted product.
import { mastheadBox } from "../frontpage/round";

type Box = { x: number; y: number; w: number; h: number };
type Clip = { id: string; box: Box; type?: string; segLabel: string; text: string; hardHistory?: boolean };
type Page = { width: number; height: number };
export type Part = { n: number; id: string; box: Box; label: string; forged: boolean };

const share = (b: Box, p: Page) => (b.w * b.h) / (p.width * p.height);
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const MASTHEAD_SHARE = 0.1;

// Big enough to read on a phone, small enough to sit among its neighbors unnoticed.
export function pickAd(clips: Clip[], page: Page): Clip | null {
  const ok = clips.filter((c) => {
    const s = share(c.box, page);
    const tall = c.box.h / c.box.w;
    return c.type === "ad" && !c.hardHistory && s >= 0.012 && s <= 0.06 && c.box.w >= 500 && c.box.h >= 500 && tall >= 0.6 && tall <= 3 && c.text.trim().length >= 60;
  });
  return ok.sort((a, b) => share(b.box, page) - share(a.box, page))[0] ?? null;
}

const labelOf = (c: Clip) => (c.type === "ad" ? "An advertisement" : /photo|illustr|image/i.test(c.segLabel) ? "A picture" : "A story");

// The masthead, the forged ad and the three largest clippings that touch neither, numbered in reading order.
export function pickParts(clips: Clip[], page: Page, forgedId: string): Part[] {
  const forged = clips.find((c) => c.id === forgedId)!;
  const mast = mastheadBox(page.width, page.height, MASTHEAD_SHARE);
  const decoys: Clip[] = [];
  const candidates = clips
    .filter((c) => c.id !== forgedId && !c.hardHistory && !overlaps(c.box, forged.box) && !overlaps(c.box, mast) && c.text.trim().length >= 40)
    .filter((c) => share(c.box, page) >= 0.01 && share(c.box, page) <= 0.15)
    .sort((a, b) => share(b.box, page) - share(a.box, page));
  for (const c of candidates) if (decoys.length < 3 && !decoys.some((d) => overlaps(d.box, c.box))) decoys.push(c);
  const parts = [
    { id: "masthead", box: mast, label: "The nameplate", forged: false },
    { id: forged.id, box: forged.box, label: "An advertisement", forged: true },
    ...decoys.map((d) => ({ id: d.id, box: d.box, label: labelOf(d), forged: false })),
  ];
  return parts.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x).map((p, i) => ({ ...p, n: i + 1 }));
}

// Linear map so the edit's mean and spread of gray match the scan's: out = a * in + b.
export function toneMatch(scan: { mean: number; sd: number }, edit: { mean: number; sd: number }) {
  const a = edit.sd > 0 ? scan.sd / edit.sd : 1;
  return { a, b: scan.mean - a * edit.mean };
}

const STYLE =
  "Keep everything else identical: the same 1889 newspaper wood-engraving and letterpress style, black ink on aged newsprint, the same size, border, layout and worn printing texture. It must look printed on the same page.";

// What gets planted, and the plain fact a reader could have caught it by.
export const PLANTS = [
  { product: "a radio receiver", prompt: `Replace this advertisement with an advertisement for a home radio receiver set. ${STYLE}`, why: "Nobody could buy a radio in 1889. Radio waves had only just been shown in a laboratory, and home radio sets went on sale in the 1920s." },
  { product: "a pocket telephone", prompt: `Change only the product in this advertisement to a telephone small enough to carry in a pocket. ${STYLE}`, why: "Telephones in 1889 were fixed to a wall and wired to an exchange. Nothing you could carry in a pocket would exist for about a hundred years." },
  { product: "a television set", prompt: `Replace this advertisement with an advertisement for a home television set that shows moving pictures. ${STYLE}`, why: "Television was first demonstrated in the 1920s. In 1889 there was no way to send a moving picture anywhere, let alone into a parlor." },
  { product: "airplane passage", prompt: `Replace this advertisement with an advertisement selling tickets for passenger flights on a flying machine with wings and a propeller. ${STYLE}`, why: "The first powered airplane flight was in December 1903. In 1889 nobody had flown a machine with wings and an engine." },
  { product: "an electric refrigerator", prompt: `Replace this advertisement with an advertisement for an electric refrigerator for the home kitchen. ${STYLE}`, why: "Kitchens in 1889 kept food cold with blocks of ice. Electric home refrigerators went on sale in the 1910s, and few homes yet had electricity." },
];
