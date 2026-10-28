// Cuts a newspaper page into clippings (decision 007):
// 1. Muse Spark boxes the layout (articles, ads, headlines, pictures) on a downscaled image.
// 2. Article columns are split into stories at the headlines inside them.
// 3. SAM finds illustrations by name and traces every non-headline box (16 per request).
// Returned boxes are in full-resolution page pixels.
import { LAYOUT_PROMPT } from "../pipeline/prompts";

export type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: "article" | "advertisement" | "headline" | "photograph";
  score: number;
  source: "sam" | "spark" | "alto";
};

export type SamRecord = { objectId: number; x1: number; y1: number; x2: number; y2: number; w: number; h: number; c?: number };

export type SegmentDeps = {
  image: (iiifBase: string, width: number) => Promise<{ dataUrl: string; w: number; h: number }>;
  spark: (imageDataUrl: string, prompt: string) => Promise<string>;
  sam: (imageDataUrl: string, text: string) => Promise<string>;
};

const SEG_WIDTH = 2000;
const SAM_MAX_OBJECTS = 16;
const LABELS = new Set<Box["label"]>(["article", "advertisement", "headline", "photograph"]);

export function parseSamOutput(text: string): SamRecord[] {
  const re = /(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?\|>/g;
  return [...text.matchAll(re)].map((m) => ({
    objectId: Number(m[1]),
    x1: Number(m[2]),
    y1: Number(m[3]),
    x2: Number(m[4]),
    y2: Number(m[5]),
    w: Number(m[6]),
    h: Number(m[7]),
    ...(m[8] !== undefined ? { c: Number(m[8]) } : {}),
  }));
}

const centerInside = (inner: Box, outer: Box) => {
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;
  return cx >= outer.x && cx <= outer.x + outer.w && cy > outer.y && cy < outer.y + outer.h;
};

export function splitColumnsAtHeadlines(boxes: Box[]): Box[] {
  const headlines = boxes.filter((b) => b.label === "headline");
  return boxes.flatMap((b) => {
    if (b.label !== "article") return [b];
    const cuts = headlines
      .filter((h) => centerInside(h, b) && h.y > b.y)
      .map((h) => h.y)
      .sort((a, c) => a - c);
    const edges = [b.y, ...cuts, b.y + b.h];
    return edges.slice(0, -1).map((top, i) => ({ ...b, y: top, h: edges[i + 1] - top }));
  });
}

function iou(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

function parseLayout(text: string, w: number, h: number): Box[] {
  const json = text.match(/\[[\s\S]*\]/);
  if (!json) throw new Error("layout model returned no JSON array");
  const items = JSON.parse(json[0]) as Array<{ object_name?: string; bbox?: Array<Record<string, number>> }>;
  return items.flatMap((o) =>
    LABELS.has(o.object_name as Box["label"])
      ? (o.bbox ?? []).map((b) => ({
          label: o.object_name as Box["label"],
          x: (b.x_min / 1000) * w,
          y: (b.y_min / 1000) * h,
          w: ((b.x_max - b.x_min) / 1000) * w,
          h: ((b.y_max - b.y_min) / 1000) * h,
          score: 1,
          source: "spark" as const,
        }))
      : [],
  );
}

const fromSam = (r: SamRecord, label: Box["label"]): Box => ({
  label,
  x: r.x1,
  y: r.y1,
  w: r.x2 + 1 - r.x1,
  h: r.y2 + 1 - r.y1,
  score: r.c ?? 1,
  source: "sam",
});

async function refine(boxes: Box[], img: { dataUrl: string; w: number; h: number }, sam: SegmentDeps["sam"]): Promise<Box[]> {
  const out: Box[] = [];
  for (let i = 0; i < boxes.length; i += SAM_MAX_OBJECTS) {
    const chunk = boxes.slice(i, i + SAM_MAX_OBJECTS);
    const clamp = (v: number, max: number) => Math.min(Math.max(Math.round(v), 0), max - 1);
    const tokens = chunk.map((b, id) =>
      `${id}<|box;x1=${clamp(b.x, img.w)};y1=${clamp(b.y, img.h)};x2=${clamp(b.x + b.w - 1, img.w)};y2=${clamp(b.y + b.h - 1, img.h)};w=${img.w};h=${img.h}|>`,
    );
    const byId = new Map(parseSamOutput(await sam(img.dataUrl, `<0f>${tokens.join(",")}`)).map((r) => [r.objectId, r]));
    chunk.forEach((b, id) => {
      const r = byId.get(id);
      out.push(r ? fromSam(r, b.label) : b);
    });
  }
  return out;
}

export async function segmentPage(
  page: { pageId: string; iiifBase: string; imageWidth: number; imageHeight: number },
  deps: SegmentDeps,
): Promise<Box[]> {
  const img = await deps.image(page.iiifBase, SEG_WIDTH);
  const layout = splitColumnsAtHeadlines(
    parseLayout(await deps.spark(img.dataUrl, LAYOUT_PROMPT), img.w, img.h).filter((b) => b.w > 0 && b.h > 0),
  );
  const illustrations = parseSamOutput(await deps.sam(img.dataUrl, "illustration")).map((r) => fromSam(r, "photograph"));
  const kept = layout.filter((b) => !(b.label === "photograph" && illustrations.some((s) => iou(s, b) > 0.5)));
  const headlines = kept.filter((b) => b.label === "headline");
  const toRefine = kept.filter((b) => b.label !== "headline");
  const refined = toRefine.length ? await refine(toRefine, img, deps.sam) : [];
  const k = page.imageWidth / img.w;
  return [...headlines, ...refined, ...illustrations]
    .filter((b) => b.w > 0 && b.h > 0)
    .map((b) => ({ ...b, x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k }));
}
