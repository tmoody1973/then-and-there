import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { LocClient } from "../../lib/loc/client";
import { LocNotFoundError } from "../../lib/loc/errors";
import { fetchManifest, fetchPage } from "../../worker/fetch";

const RESULT = {
  id: "http://www.loc.gov/resource/sn88064119/1889-11-29/ed-1/?sp=1",
  date: "1889-11-29",
  number_lccn: ["sn88064119"],
  partof_title: ["homer guardian (homer, la.) 1888-1890"],
  location_city: ["homer"],
  location_state: ["louisiana"],
  number_page: ["0000000001"],
  language: ["english"],
  image_url: [
    "https://tile.loc.gov/text-services/word-coordinates-service?segment=/service/ndnp/lu/batch_lu_iceman_ver01/data/sn88064119/00280761837/1889112901/0223.xml&format=alto_xml",
  ],
};
const CITE = { apa: "APA cite", chicago: "Chicago cite", mla: "MLA cite" };

function fakeClient(over: Partial<LocClient> = {}) {
  const counts = { page: 0, text: 0, json: 0, search: 0 };
  const client: LocClient = {
    searchPages: async () => {
      counts.search += 1;
      return { total: 2, results: [RESULT, { ...RESULT, id: RESULT.id.replace("sp=1", "sp=2") }] };
    },
    getPageJson: async () => {
      counts.page += 1;
      return { cite_this: CITE };
    },
    getText: async () => {
      counts.text += 1;
      return "<alto/>";
    },
    getJson: async () => {
      counts.json += 1;
      return { width: 5956, height: 9351 };
    },
    getBytes: async () => new Uint8Array(),
    ...over,
  };
  return { client, counts };
}

const tmp = () => mkdtempSync(join(tmpdir(), "tt-fetch-"));

describe("fetchPage", () => {
  test("writes cache files and meta", async () => {
    const dir = tmp();
    const page = await fetchPage(fakeClient().client, RESULT, dir);
    expect(page.status).toBe("fetched");
    expect(page.citeThis.mla).toBe("MLA cite");
    expect(page.imageWidth).toBe(5956);
    expect(page.sequence).toBe(1);
    expect(page.iiifBase).toContain("service:ndnp:lu:batch_lu_iceman_ver01");
    const folder = join(dir, page.pageId.replace(/[^\w.-]+/g, "_"));
    for (const f of ["page.json", "alto.xml", "meta.json"]) expect(existsSync(join(folder, f))).toBe(true);
  });

  test("second call makes no network calls", async () => {
    const dir = tmp();
    const { client, counts } = fakeClient();
    await fetchPage(client, RESULT, dir);
    await fetchPage(client, RESULT, dir);
    expect(counts).toEqual({ page: 1, text: 1, json: 1, search: 0 });
  });

  test("skips pages from 1931 or later", async () => {
    const { client, counts } = fakeClient();
    const page = await fetchPage(client, { ...RESULT, date: "1931-01-02" }, tmp());
    expect(page.status).toBe("failed");
    expect(page.error).toBe("post-1930");
    expect(counts.page + counts.text + counts.json).toBe(0);
  });

  test("404 alto marks failed", async () => {
    const { client } = fakeClient({
      getText: async (u) => {
        throw new LocNotFoundError(u);
      },
    });
    const page = await fetchPage(client, RESULT, tmp());
    expect(page.status).toBe("failed");
    expect(page.error).toMatch(/404/);
  });
});

describe("fetchManifest", () => {
  test("continues past a failed page", async () => {
    const dir = tmp();
    let n = 0;
    const { client } = fakeClient({
      getText: async (u) => {
        n += 1;
        if (n === 1) throw new LocNotFoundError(u);
        return "<alto/>";
      },
    });
    const manifest = join(dir, "m.json");
    writeFileSync(manifest, JSON.stringify([{ qs: "nellie bly", ops: "PHRASE", limit: 2 }]));
    const pages = await fetchManifest(client, manifest, join(dir, "cache"));
    expect(pages.map((p) => p.status)).toEqual(["failed", "fetched"]);
    expect(JSON.parse(readFileSync(manifest, "utf8"))).toHaveLength(1);
  });

  test("fetches up to 4 pages at once", async () => {
    const dir = tmp();
    let inFlight = 0;
    let peak = 0;
    const results = Array.from({ length: 8 }, (_, i) => ({ ...RESULT, id: RESULT.id.replace("sp=1", `sp=${i + 1}`) }));
    const { client } = fakeClient({
      searchPages: async () => ({ total: 8, results }),
      getPageJson: async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return { cite_this: CITE };
      },
    });
    const manifest = join(dir, "m.json");
    writeFileSync(manifest, JSON.stringify([{ qs: "x", limit: 8 }]));
    const pages = await fetchManifest(client, manifest, join(dir, "cache"));
    expect(pages).toHaveLength(8);
    expect(peak).toBe(4);
  });
});
