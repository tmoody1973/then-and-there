import { describe, expect, test } from "vitest";
import { createLocClient } from "../../lib/loc/client";
import {
  LocBadResponseError,
  LocBlockedError,
  LocNotFoundError,
  LocRateLimitError,
} from "../../lib/loc/errors";

type Reply = { status?: number; body?: string; contentType?: string };

// Fake clock: sleep advances time, so the limiter's waits are observable.
function harness(replies: Reply[] | ((url: string) => Reply)) {
  let t = 0;
  const sleeps: number[] = [];
  const calls: { url: string; at: number; ua: string }[] = [];
  const queue = Array.isArray(replies) ? [...replies] : null;
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, at: t, ua: new Headers(init?.headers).get("user-agent") ?? "" });
    const r = queue ? queue.shift() ?? {} : (replies as (u: string) => Reply)(url);
    return new Response(r.body ?? "{}", {
      status: r.status ?? 200,
      headers: { "content-type": r.contentType ?? "application/json" },
    });
  }) as typeof fetch;
  const client = createLocClient({
    fetchImpl,
    now: () => t,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
  });
  return { client, sleeps, calls };
}

describe("LocClient", () => {
  test("searchPages builds advanced URL", async () => {
    const { client, calls } = harness([
      { body: JSON.stringify({ pagination: { of: 410 }, results: [{ id: "x" }] }) },
    ]);
    const res = await client.searchPages({
      qs: "nellie bly",
      ops: "PHRASE",
      startDate: "1889-11-14",
      endDate: "1890-01-31",
    });
    const params = new URL(calls[0].url).searchParams;
    expect(params.get("searchType")).toBe("advanced");
    expect(params.get("fo")).toBe("json");
    expect(params.get("dl")).toBe("page");
    expect(params.get("qs")).toBe("nellie bly");
    expect(params.get("ops")).toBe("PHRASE");
    expect(params.get("start_date")).toBe("1889-11-14");
    expect(params.get("end_date")).toBe("1890-01-31");
    expect(res).toEqual({ total: 410, results: [{ id: "x" }] });
  });

  test("keyword-free search sends a multilingual OR keyword (Library loops without one)", async () => {
    const { client, calls } = harness([{ body: JSON.stringify({ pagination: { of: 1 }, results: [] }) }]);
    await client.searchPages({ startDate: "1889-11-14", endDate: "1890-01-25", state: "kansas", frontPagesOnly: true });
    const params = new URL(calls[0].url).searchParams;
    expect(params.get("ops")).toBe("OR");
    expect(params.get("qs")).toBe("the der und w i a ir");
    expect(params.get("searchType")).toBe("advanced");
  });

  test("a keyword without ops defaults ops to AND", async () => {
    const { client, calls } = harness([{ body: JSON.stringify({ pagination: { of: 1 }, results: [] }) }]);
    await client.searchPages({ qs: "nellie bly" });
    expect(new URL(calls[0].url).searchParams.get("ops")).toBe("AND");
  });

  test("json bucket defaults to 10 per minute", async () => {
    const { client, sleeps, calls } = harness(() => ({ body: "{}" }));
    for (let i = 0; i < 11; i++) await client.getPageJson("https://www.loc.gov/resource/a/?fo=json");
    expect(calls[10].at).toBeGreaterThanOrEqual(60_000);
    expect(Math.max(...sleeps)).toBeGreaterThanOrEqual(59_000);
  });

  test("json bucket waits after the configured limit", async () => {
    let t = 0;
    const calls: number[] = [];
    const client = createLocClient({
      jsonPerMinute: 20,
      now: () => t,
      sleep: async (ms) => void (t += ms),
      fetchImpl: (async () => (calls.push(t), new Response("{}"))) as unknown as typeof fetch,
    });
    for (let i = 0; i < 21; i++) await client.getPageJson("https://www.loc.gov/resource/a/?fo=json");
    expect(calls.slice(0, 20).every((c) => c === 0)).toBe(true);
    expect(calls[20]).toBeGreaterThanOrEqual(60_000);
  });

  test("services bucket allows 150/min", async () => {
    const { client, sleeps } = harness(() => ({ body: "<alto/>", contentType: "text/xml" }));
    for (let i = 0; i < 150; i++) await client.getText("https://tile.loc.gov/storage-services/x.xml");
    expect(sleeps).toEqual([]);
  });

  test("429 backs off then retries", async () => {
    const { client, sleeps } = harness([{ status: 429 }, { body: '{"ok":true}' }]);
    await expect(client.getPageJson("https://www.loc.gov/resource/a/")).resolves.toEqual({ ok: true });
    expect(Math.max(...sleeps)).toBeGreaterThanOrEqual(60_000);
  });

  test("503 backs off then retries", async () => {
    const { client, sleeps } = harness([{ status: 503 }, { body: '{"ok":true}' }]);
    await expect(client.getPageJson("https://www.loc.gov/resource/a/")).resolves.toEqual({ ok: true });
    expect(Math.max(...sleeps)).toBeGreaterThanOrEqual(30_000);
  });

  test("three 503s throw LocBadResponseError", async () => {
    const { client } = harness([{ status: 503 }, { status: 503 }, { status: 503 }]);
    await expect(client.getJson("https://tile.loc.gov/x/info.json")).rejects.toBeInstanceOf(LocBadResponseError);
  });

  test("three 429s throw LocRateLimitError", async () => {
    const { client } = harness([{ status: 429 }, { status: 429 }, { status: 429 }]);
    await expect(client.getPageJson("https://www.loc.gov/resource/a/")).rejects.toBeInstanceOf(
      LocRateLimitError,
    );
  });

  test("html body is a block and pauses every bucket", async () => {
    const { client, sleeps } = harness([
      { body: "<html>captcha</html>", contentType: "text/html" },
      { body: "<alto/>", contentType: "text/xml" },
    ]);
    await expect(client.getPageJson("https://www.loc.gov/resource/a/")).rejects.toBeInstanceOf(
      LocBlockedError,
    );
    await client.getText("https://tile.loc.gov/storage-services/x.xml");
    expect(sleeps[0]).toBeGreaterThanOrEqual(600_000);
  });

  test("an html block served as OCR text is a block, not text", async () => {
    const { client, sleeps } = harness([
      { body: "<html>captcha</html>", contentType: "text/html" },
      { body: "<alto/>", contentType: "text/xml" },
    ]);
    await expect(client.getText("https://tile.loc.gov/storage-services/x.xml")).rejects.toBeInstanceOf(LocBlockedError);
    await client.getText("https://tile.loc.gov/storage-services/y.xml");
    expect(sleeps[0]).toBeGreaterThanOrEqual(600_000);
  });

  test("an html block served as an image is a block, not bytes", async () => {
    const { client } = harness([{ body: "<!DOCTYPE html><html>captcha</html>", contentType: "text/html; charset=utf-8" }]);
    await expect(client.getBytes("https://tile.loc.gov/image-services/iiif/x/full/2000,/0/default.jpg")).rejects.toBeInstanceOf(
      LocBlockedError,
    );
  });

  test("an html body with the wrong content-type is still a block", async () => {
    const { client } = harness([{ body: "  <!doctype html><html>captcha</html>", contentType: "text/plain" }]);
    await expect(client.getPageJson("https://www.loc.gov/resource/a/")).rejects.toBeInstanceOf(LocBlockedError);
  });

  test("truncated json retries once", async () => {
    const { client } = harness([{ body: '{"results":[{"a":' }, { body: '{"results":[]}' }]);
    await expect(client.getPageJson("https://www.loc.gov/resource/a/")).resolves.toEqual({ results: [] });
  });

  test("two truncated bodies throw LocBadResponseError", async () => {
    const { client } = harness([{ body: '{"results":' }, { body: '{"results":' }]);
    await expect(client.getPageJson("https://www.loc.gov/resource/a/")).rejects.toBeInstanceOf(
      LocBadResponseError,
    );
  });

  test("sends a descriptive User-Agent", async () => {
    const { client, calls } = harness([{ body: "<alto/>", contentType: "text/xml" }]);
    await client.getText("https://tile.loc.gov/storage-services/x.xml");
    expect(calls[0].ua).toMatch(/^then-and-there\//);
  });

  test("getBytes returns raw bytes on the services bucket", async () => {
    const { client } = harness([{ body: "JPEGDATA", contentType: "image/jpeg" }]);
    const bytes = await client.getBytes("https://tile.loc.gov/image-services/iiif/x/full/2000,/0/default.jpg");
    expect(new TextDecoder().decode(bytes)).toBe("JPEGDATA");
  });

  test("404 is not retried", async () => {
    const { client, calls } = harness([{ status: 404 }]);
    await expect(client.getText("https://tile.loc.gov/storage-services/x.xml")).rejects.toBeInstanceOf(
      LocNotFoundError,
    );
    expect(calls).toHaveLength(1);
  });
});
