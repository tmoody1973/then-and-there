import { beforeAll, describe, expect, test } from "vitest";
import { cleanClipping, needsCleanup } from "../../lib/pipeline/clean";

beforeAll(() => {
  process.env.META_MODEL_BULK = "bulk-model";
  process.env.META_MODEL_SPARK = "strong-model";
});

const clip = { clippingId: "c1", cropUrl: "https://iiif/x/1,2,3,4/!1600,3200/0/default.jpg", rawText: "Nellie IllyM tri" };

function deps(reply: string) {
  const models: string[] = [];
  return {
    models,
    d: {
      complete: async (req: { model: string; prompt: string; imageDataUrl?: string }) => {
        models.push(req.model);
        return reply;
      },
      loadImage: async () => "data:image/jpeg;base64,AA",
    },
  };
}

describe("needsCleanup", () => {
  test("good text is left alone", () => expect(needsCleanup({ meanWc: 0.85, nonDictRate: 0.09 })).toBe(false));
  test("low confidence triggers", () => expect(needsCleanup({ meanWc: 0.79, nonDictRate: 0.05 })).toBe(true));
  test("garble triggers", () => expect(needsCleanup({ meanWc: 0.9, nonDictRate: 0.13 })).toBe(true));
});

describe("cleanClipping", () => {
  const ok = JSON.stringify({ cleanedText: "Nellie Bly's trip", language: "english" });

  test("uses the strong model for heavy garble", async () => {
    const { d, models } = deps(ok);
    await cleanClipping({ ...clip, nonDictRate: 0.3 }, d);
    expect(models).toEqual(["strong-model"]);
  });

  test("uses the bulk model otherwise", async () => {
    const { d, models } = deps(ok);
    const out = await cleanClipping({ ...clip, nonDictRate: 0.15 }, d);
    expect(models).toEqual(["bulk-model"]);
    expect(out).toEqual({ cleanedText: "Nellie Bly's trip", language: "english" });
  });

  test("keeps a translation only for non-English text", async () => {
    const reply = JSON.stringify({ cleanedText: "Hallo", language: "german", translation: "Hello" });
    expect((await cleanClipping({ ...clip, nonDictRate: 0.2 }, deps(reply).d)).translation).toBe("Hello");
    const en = JSON.stringify({ cleanedText: "Hi", language: "english", translation: "Hi" });
    expect((await cleanClipping({ ...clip, nonDictRate: 0.2 }, deps(en).d)).translation).toBeUndefined();
  });

  test("throws after a retry on malformed output", async () => {
    const { d, models } = deps("sure! here you go");
    await expect(cleanClipping({ ...clip, nonDictRate: 0.2 }, d)).rejects.toThrow(/malformed/);
    expect(models).toHaveLength(2);
  });
});
