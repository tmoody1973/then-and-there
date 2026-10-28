// Throwaway segmentation spike. Usage:
//   bun spikes/sam/run.ts smoke        -> one SAM call on page 1, prints raw output
//   bun spikes/sam/run.ts all          -> SAM x4 prompts + Spark x1 on all 5 pages, saves raw outputs
import OpenAI from "openai";
import { mkdirSync, writeFileSync } from "node:fs";

const PAGES = [
  { id: "eveningworld-1889-11-29", iiif: "https://tile.loc.gov/image-services/iiif/service:ndnp:nn:batch_nn_hanyu_ver01:data:sn83030193:00206539525:1889112902:0708" },
  { id: "homer-1889-11-29", iiif: "https://tile.loc.gov/image-services/iiif/service:ndnp:lu:batch_lu_iceman_ver01:data:sn88064119:00280761837:1889112901:0223" },
  { id: "advocate-1898-12-09-p4", iiif: "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_ifill_ver01:data:sn84025861:00211664770:1898120901:0236" },
  { id: "sonntagsbote-1909-07-11", iiif: "https://tile.loc.gov/image-services/iiif/service:ndnp:whi:batch_whi_erkling_ver02:data:sn87082455:00414215233:1909071101:0217" },
  { id: "kenosha-1889-12-05", iiif: "https://tile.loc.gov/image-services/iiif/service:ndnp:whi:batch_whi_engledinger_ver02:data:sn85040310:00514152123:1889120501:0075" },
];
const PROMPTS = ["photograph", "advertisement", "headline", "article"];
const WIDTH = 2000;
const OUT = "spikes/sam/out";

const client = new OpenAI({ baseURL: process.env.META_BASE_URL, apiKey: process.env.META_API_KEY });
// The Library's image server returns 403 to Meta's fetcher, so send bytes inline.
const cache = new Map<string, string>();
async function imageUrl(iiif: string): Promise<string> {
  const hit = cache.get(iiif);
  if (hit) return hit;
  const res = await fetch(`${iiif}/full/${WIDTH},/0/default.jpg`);
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  const url = `data:image/jpeg;base64,${b64}`;
  cache.set(iiif, url);
  return url;
}

async function sam(iiif: string, prompt: string): Promise<string> {
  const res = await client.responses.create({
    model: process.env.META_MODEL_SAM!,
    input: [{ type: "message", role: "user", content: [
      { type: "input_text", text: prompt },
      { type: "input_image", image_url: await imageUrl(iiif), detail: "auto" },
    ] }],
    metadata: { include_confidence: "true" },
  } as never);
  const t = (res as { output_text?: string }).output_text; return t && t.length ? t : JSON.stringify(res);
}

async function spark(iiif: string): Promise<string> {
  const prompt =
    'You are an object grounding expert. This is a scanned historic newspaper page. Provide the bounding box coordinates of every "article", "advertisement", "headline", and "photograph" (photographs or illustrations) on the page. Ensure the objects accurately match the request and do not miss any objects. For each object, answer in the format {"object_name": "<name>", "bbox": [{"x_min": <int>, "y_min": <int>, "x_max": <int>, "y_max": <int>}]}. The coordinates should be in the 0-1000 range. Return a JSON array of results. If you cannot find an object, omit it from the results.';
  const res = await client.chat.completions.create({
    model: process.env.META_MODEL_SPARK!,
    messages: [{ role: "user", content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: await imageUrl(iiif) } },
    ] }],
  });
  return res.choices[0]?.message?.content ?? "";
}

mkdirSync(OUT, { recursive: true });
const mode = process.argv[2];
if (mode === "smoke") {
  const out = await sam(PAGES[0].iiif, "headline");
  console.log(out.slice(0, 800));
} else if (mode === "all") {
  for (const p of PAGES) {
    for (const prompt of PROMPTS) {
      try {
        writeFileSync(`${OUT}/${p.id}-${prompt}.txt`, await sam(p.iiif, prompt));
        console.log("ok sam", p.id, prompt);
      } catch (e) {
        console.log("FAIL sam", p.id, prompt, String(e).slice(0, 200));
      }
    }
    try {
      writeFileSync(`${OUT}/${p.id}-spark.txt`, await spark(p.iiif));
      console.log("ok spark", p.id);
    } catch (e) {
      console.log("FAIL spark", p.id, String(e).slice(0, 200));
    }
  }
}
