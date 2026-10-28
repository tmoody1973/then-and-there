// The only code allowed to call the Library of Congress. It enforces the published
// rate limits (JSON API documented at 20/min with a 1-hour block, but 20/min got us blocked
// on 2026-10-28, so default to 10; services 150/min) with a sliding
// 60-second window per bucket, backs off on 429, and pauses everything on a block page.
import {
  LocBadResponseError,
  LocBlockedError,
  LocNotFoundError,
  LocRateLimitError,
} from "./errors";

const SEARCH_BASE = "https://www.loc.gov/collections/chronicling-america/";
const WINDOW_MS = 60_000;
const BLOCK_PAUSE_MS = 10 * 60_000;
const DEFAULT_429_WAIT_MS = 60_000;
const MAX_429 = 3;
const MAX_5XX = 3;
const SERVER_ERROR_WAIT_MS = 30_000;
// The Library 403s some default user agents; always identify ourselves.
const USER_AGENT = "then-and-there/0.1 (historic newspaper research; Radio Milwaukee)";

export type SearchParams = {
  qs?: string;
  ops?: "AND" | "PHRASE" | "OR";
  startDate?: string;
  endDate?: string;
  state?: string;
  city?: string;
  frontPagesOnly?: boolean;
  facets?: string[];
  count?: number;
  page?: number;
};

export type LocSearchResult = { total: number; results: Array<Record<string, unknown>> };

export type LocClient = {
  searchPages(p: SearchParams): Promise<LocSearchResult>;
  getPageJson(resourceUrl: string): Promise<unknown>;
  getText(url: string): Promise<string>;
  getJson(url: string): Promise<unknown>;
  getBytes(url: string): Promise<Uint8Array>;
};

type Opts = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  jsonPerMinute?: number;
  servicesPerMinute?: number;
};

type Bucket = { limit: number; stamps: number[] };

// Since 2026-10-28 afternoon the Library redirect-loops advanced searches with no keyword
// or no ops. Keyword-free searches match any of a few common words across our languages.
const ANY_WORD = "the der und w i a ir";

export function buildSearchUrl(p: SearchParams): string {
  const q = new URLSearchParams({ dl: "page", searchType: "advanced", fo: "json" });
  q.set("qs", p.qs || ANY_WORD);
  q.set("ops", p.qs ? (p.ops ?? "AND") : "OR");
  if (p.startDate) q.set("start_date", p.startDate);
  if (p.endDate) q.set("end_date", p.endDate);
  if (p.state) q.set("location_state", p.state);
  if (p.city) q.set("location_city", p.city);
  if (p.frontPagesOnly) q.set("front_pages_only", "true");
  if (p.facets?.length) q.set("fa", p.facets.join("|"));
  if (p.count) q.set("c", String(p.count));
  if (p.page) q.set("sp", String(p.page));
  return `${SEARCH_BASE}?${q.toString()}`;
}

const HTML_START = /^\s*<(!doctype html|html)/i;

export function createLocClient(opts: Opts = {}): LocClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const json: Bucket = { limit: opts.jsonPerMinute ?? 10, stamps: [] };
  const services: Bucket = { limit: opts.servicesPerMinute ?? 150, stamps: [] };
  let blockedUntil = 0;

  // ponytail: in-process limiter; one worker process at a time is the deployment model.
  async function takeSlot(b: Bucket): Promise<void> {
    if (now() < blockedUntil) await sleep(blockedUntil - now());
    b.stamps = b.stamps.filter((s) => s > now() - WINDOW_MS);
    if (b.stamps.length >= b.limit) {
      await sleep(b.stamps[0] + WINDOW_MS - now());
      b.stamps = b.stamps.filter((s) => s > now() - WINDOW_MS);
    }
    b.stamps = [...b.stamps, now()];
  }

  async function request(url: string, bucket: Bucket, kind: "json" | "text" | "bytes"): Promise<unknown> {
    let rateLimited = 0;
    let badBodies = 0;
    let serverErrors = 0;
    for (;;) {
      await takeSlot(bucket);
      const res = await fetchImpl(url, { headers: { "user-agent": USER_AGENT } });
      if (res.status === 404) throw new LocNotFoundError(url);
      if (res.status === 429) {
        rateLimited += 1;
        if (rateLimited >= MAX_429) throw new LocRateLimitError(url);
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(retryAfter > 0 ? retryAfter * 1000 : DEFAULT_429_WAIT_MS);
        continue;
      }
      if (res.status >= 500) {
        serverErrors += 1;
        if (serverErrors >= MAX_5XX) throw new LocBadResponseError(url, `HTTP ${res.status} after ${MAX_5XX} tries`);
        await sleep(SERVER_ERROR_WAIT_MS * serverErrors);
        continue;
      }
      if (!res.ok) throw new LocBadResponseError(url, `HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      // A block (CAPTCHA) page arrives as 200 OK on any endpoint, sometimes mislabeled.
      const head = new TextDecoder().decode(bytes.subarray(0, 256));
      if ((res.headers.get("content-type") ?? "").includes("text/html") || HTML_START.test(head)) {
        blockedUntil = now() + BLOCK_PAUSE_MS;
        throw new LocBlockedError(url);
      }
      if (kind === "bytes") return bytes;
      const body = new TextDecoder().decode(bytes);
      if (kind === "text") return body;
      try {
        return JSON.parse(body);
      } catch {
        badBodies += 1;
        if (badBodies > 1) throw new LocBadResponseError(url, "invalid or truncated JSON");
      }
    }
  }

  return {
    async searchPages(p) {
      const data = (await request(buildSearchUrl(p), json, "json")) as {
        pagination?: { of?: number };
        results?: Array<Record<string, unknown>>;
      };
      return { total: data.pagination?.of ?? 0, results: data.results ?? [] };
    },
    getPageJson: (url) => request(url, json, "json"),
    getText: (url) => request(url, services, "text") as Promise<string>,
    getJson: (url) => request(url, services, "json"),
    getBytes: (url) => request(url, services, "bytes") as Promise<Uint8Array>,
  };
}
