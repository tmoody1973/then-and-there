import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type OpenAI from "openai";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { makeComplete } from "../../lib/meta/client";
import { askJson } from "../../lib/pipeline/askJson";

// A fake model that answers from a script, counting real calls.
function fakeClient(replies: string[]) {
  const state = { calls: 0 };
  const client = {
    chat: { completions: { create: async () => ({ choices: [{ message: { content: replies[state.calls++] ?? "" } }], usage: {} }) } },
  } as unknown as OpenAI;
  return { client, state };
}
const dir = () => mkdtempSync(join(tmpdir(), "tt-cache-"));
const REQ = { model: "m", prompt: "p" };

describe("makeComplete + askJson", () => {
  test("a retry after malformed JSON re-asks the model instead of replaying the cached reply", async () => {
    const { client, state } = fakeClient(["not json", '{"a":1}']);
    const res = await askJson(z.object({ a: z.number() }), makeComplete(client, "s", undefined, dir()), REQ);
    expect(res).toEqual({ ok: true, value: { a: 1 } });
    expect(state.calls).toBe(2);
  });

  test("an empty reply is never cached", async () => {
    const { client, state } = fakeClient(["", "hello"]);
    const complete = makeComplete(client, "s", undefined, dir());
    await expect(complete(REQ)).rejects.toThrow(/empty/);
    expect(await complete(REQ)).toBe("hello");
    expect(state.calls).toBe(2);
  });

  test("a first attempt keeps its existing cache key", async () => {
    const { client, state } = fakeClient(["once"]);
    const complete = makeComplete(client, "s", undefined, dir());
    expect(await complete(REQ)).toBe("once");
    expect(await complete({ ...REQ, attempt: 0 })).toBe("once");
    expect(state.calls).toBe(1);
  });
});
