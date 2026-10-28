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

  test("json bucket waits after 20 calls", async () => {
    const { client, sleeps, calls } = harness(() => ({ body: "{}" }));
    for (let i = 0; i < 21; i++) await client.getPageJson("https://www.loc.gov/resource/a/?fo=json");
    expect(calls.slice(0, 20).every((c) => c.at === 0)).toBe(true);
    expect(calls[20].at).toBeGreaterThanOrEqual(60_000);
    expect(Math.max(...sleeps)).toBeGreaterThanOrEqual(59_000);
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
