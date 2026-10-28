// Fetch worker: downloads each page's metadata, ALTO OCR file and image size once,
// caches them on disk, and never refetches a page already cached as "fetched".
// Usage: bun worker/fetch.ts data/manifest/demo-pages.json [cacheDir]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createLocClient, type LocClient, type SearchParams } from "../lib/loc/client";
import { pathsFromImageUrls } from "../lib/loc/paths";
import { mapPool } from "../lib/util/pool";

const PUBLIC_DOMAIN_BEFORE = "1931-01-01";
const SEARCH_PAGE_SIZE = 100;
// Library calls are slow (3-50 s); overlap a few. The client's limiter still caps the rate.
const CONCURRENCY = 4;

export type CachedPage = {
  pageId: string;
  lccn: string;
  title: string;
  city: string;
  state: string;
  date: string;
  sequence: number;
  language: string[];
  iiifBase: string;
  altoUrl: string;
  imageWidth: number;
  imageHeight: number;
  citeThis: { apa: string; chicago: string; mla: string };
  status: "fetched" | "failed";
  error?: string;
};

export type ManifestSpec = SearchParams & { limit: number };

type Result = Record<string, unknown>;

const first = (v: unknown): string => (Array.isArray(v) ? String(v[0] ?? "") : String(v ?? ""));
export const safeId = (pageId: string) => pageId.replace(/[^\w.-]+/g, "_");

function baseFields(r: Result): Omit<CachedPage, "iiifBase" | "altoUrl" | "imageWidth" | "imageHeight" | "citeThis" | "status"> {
  return {
    pageId: String(r.id),
    lccn: first(r.number_lccn),
    title: first(r.partof_title),
    city: first(r.location_city),
    state: first(r.location_state),
    date: String(r.date ?? ""),
    sequence: Number(first(r.number_page)) || 0,
    language: Array.isArray(r.language) ? r.language.map(String) : [],
  };
}

function pageJsonUrl(pageId: string): string {
  const u = new URL(pageId.replace(/^http:/, "https:"));
  u.searchParams.set("fo", "json");
  return u.toString();
}

export async function fetchPage(client: LocClient, r: Result, cacheDir: string): Promise<CachedPage> {
  const base = baseFields(r);
  const folder = join(cacheDir, safeId(base.pageId));
  const metaPath = join(folder, "meta.json");
  if (existsSync(metaPath)) {
    const cached = JSON.parse(readFileSync(metaPath, "utf8")) as CachedPage;
    if (cached.status === "fetched") return cached;
  }
  const empty = { iiifBase: "", altoUrl: "", imageWidth: 0, imageHeight: 0, citeThis: { apa: "", chicago: "", mla: "" } };
  if (base.date >= PUBLIC_DOMAIN_BEFORE) return { ...base, ...empty, status: "failed", error: "post-1930" };

  mkdirSync(folder, { recursive: true });
  let page: CachedPage;
  try {
    const { altoUrl, iiifBase } = pathsFromImageUrls((r.image_url as string[]) ?? []);
    const pageJson = (await client.getPageJson(pageJsonUrl(base.pageId))) as { cite_this?: CachedPage["citeThis"] };
    const alto = await client.getText(altoUrl);
    const info = (await client.getJson(`${iiifBase}/info.json`)) as { width: number; height: number };
    writeFileSync(join(folder, "page.json"), JSON.stringify(pageJson));
    writeFileSync(join(folder, "alto.xml"), alto);
    page = {
      ...base,
      altoUrl,
      iiifBase,
      imageWidth: info.width,
      imageHeight: info.height,
      citeThis: pageJson.cite_this ?? empty.citeThis,
      status: "fetched",
    };
  } catch (e) {
    page = { ...base, ...empty, status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
  writeFileSync(metaPath, JSON.stringify(page, null, 2));
  return page;
}

export async function fetchManifest(client: LocClient, manifestPath: string, cacheDir: string): Promise<CachedPage[]> {
  const specs = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestSpec[];
  const out: CachedPage[] = [];
  for (const { limit, ...params } of specs) {
    const results: Result[] = [];
    for (let p = 1; results.length < limit; p += 1) {
      const { results: batch } = await client.searchPages({ ...params, count: Math.min(limit, SEARCH_PAGE_SIZE), page: p });
      if (!batch.length) break;
      results.push(...batch);
      if (batch.length < Math.min(limit, SEARCH_PAGE_SIZE)) break;
    }
    out.push(...(await mapPool(results.slice(0, limit), CONCURRENCY, (r) => fetchPage(client, r, cacheDir))));
  }
  return out;
}

if (import.meta.main) {
  const [manifest, cacheDir = "cache/pages"] = process.argv.slice(2);
  if (!manifest) throw new Error("usage: bun worker/fetch.ts <manifest.json> [cacheDir]");
  const pages = await fetchManifest(createLocClient(), manifest, cacheDir);
  const failed = pages.filter((p) => p.status === "failed");
  process.stdout.write(`fetched ${pages.length - failed.length} / failed ${failed.length}\n`);
  for (const f of failed.slice(0, 20)) process.stdout.write(`  failed ${f.pageId}: ${f.error}\n`);
}
