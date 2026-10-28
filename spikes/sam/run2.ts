// Spike round 2: (a) concrete concept prompts, (b) Spark boxes -> SAM box prompts.
//   bun spikes/sam/run2.ts
import OpenAI from "openai";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "spikes/sam/out";
const WIDTH = 2000;
const PAGES = {
  homer: "https://tile.loc.gov/image-services/iiif/service:ndnp:lu:batch_lu_iceman_ver01:data:sn88064119:00280761837:1889112901:0223",
  eveningworld: "https://tile.loc.gov/image-services/iiif/service:ndnp:nn:batch_nn_hanyu_ver01:data:sn83030193:00206539525:1889112902:0708",
};
const CONCRETE = ["illustration", "portrait", "column of text", "ornamental border", "printed text block"];

const client = new OpenAI({ baseURL: process.env.META_BASE_URL, apiKey: process.env.META_API_KEY });

async function image(iiif: string): Promise<{ url: string; w: number; h: number }> {
  const info = (await (await fetch(`${iiif}/info.json`)).json()) as { width: number; height: number };
  const h = Math.round((info.height * WIDTH) / info.width);
  const res = await fetch(`${iiif}/full/${WIDTH},/0/default.jpg`);
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  return { url: `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`, w: WIDTH, h };
}

async function sam(url: string, text: string): Promise<string> {
  const res = (await client.responses.create({
    model: process.env.META_MODEL_SAM!,
    input: [{ type: "message", role: "user", content: [
      { type: "input_text", text },
      { type: "input_image", image_url: url, detail: "auto" },
    ] }],
    metadata: { include_confidence: "true" },
  } as never)) as { output_text?: string };
  return res.output_text ?? "";
}

const boxes = (t: string) => [...t.matchAll(/<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=\d+;h=\d+(?:;c=([\d.]+))?\|>/g)];

for (const [name, iiif] of Object.entries(PAGES)) {
  const img = await image(iiif);
  for (const p of CONCRETE) {
    const out = await sam(img.url, p);
    writeFileSync(`${OUT}/r2-${name}-${p.replace(/ /g, "_")}.txt`, out);
    console.log(name, JSON.stringify(p), "->", boxes(out).length, "boxes");
  }
  if (name !== "homer") continue;
  // Chain: Spark's boxes (0-1000) -> pixel box prompts -> SAM.
  const raw = readFileSync(`${OUT}/homer-1889-11-29-spark.txt`, "utf8");
  const arr = JSON.parse(raw.match(/\[[\s\S]*\]/)![0]) as Array<{ object_name: string; bbox: Array<{ x_min: number; y_min: number; x_max: number; y_max: number }> }>;
  const picked = arr.filter((o) => o.object_name !== "headline").slice(0, 16);
  const tokens = picked.map((o, i) => {
    const b = o.bbox[0];
    const x1 = Math.round((b.x_min / 1000) * img.w), y1 = Math.round((b.y_min / 1000) * img.h);
    const x2 = Math.round((b.x_max / 1000) * img.w) - 1, y2 = Math.round((b.y_max / 1000) * img.h) - 1;
    return `${i}<|box;x1=${x1};y1=${y1};x2=${x2};y2=${y2};w=${img.w};h=${img.h}|>`;
  });
  const prompt = `<0f>${tokens.join(",")}`;
  writeFileSync(`${OUT}/r2-chain-prompt.txt`, prompt);
  const out = await sam(img.url, prompt);
  writeFileSync(`${OUT}/r2-chain-homer.txt`, out);
  const got = boxes(out);
  console.log("chain: sent", picked.length, "boxes; SAM returned", got.length, "; confidences", got.map((m) => m[5]).join(","));
}
