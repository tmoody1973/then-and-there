import { describe, expect, test } from "vitest";
import type { EditorRun } from "../../convex/editorRuns";
import { labelClaim, verifyLabel } from "../../lib/editor/labels";
import type { CompleteReq } from "../../lib/pipeline/askJson";

const INPUT = { clippingId: "c1", type: "person", people: ["J. E. Ellmore"], text: "Mr. J. E. Ellmore has a shaving parlor.", cropUrl: "https://x/crop.jpg" };

describe("labelClaim", () => {
  test("labelClaim names up to 3 people and the type", () => {
    expect(labelClaim({ type: "person", people: ["A", "B", "C", "D"] })).toBe("A person story naming A, B and C");
    expect(labelClaim({ type: "event", people: [] })).toBe("An event story");
    expect(labelClaim({ type: "ad", people: [] })).toBe("An advertisement");
  });
});

describe("verifyLabel", () => {
  test("verifyLabel fails closed when the model is unreachable", async () => {
    const logs: EditorRun[] = [];
    const res = await verifyLabel(INPUT, {
      complete: async () => { throw new Error("socket closed"); },
      loadImage: async () => "data:image/jpeg;base64,AA",
      log: async (r) => void logs.push(r),
    });
    expect(res).toEqual({ pass: false, reason: "editor-unavailable" });
    expect(logs[0]).toMatchObject({ subjectKind: "clipping", subjectId: "c1", pass: false });
  });

  test("verifyLabel asks about a historic newspaper, not specifically 1889-90", async () => {
    const seen: CompleteReq[] = [];
    await verifyLabel(INPUT, {
      complete: async (req) => (seen.push(req), '{"pass": true, "reason": "names Ellmore"}'),
      loadImage: async () => "data:image/jpeg;base64,AA",
      log: async () => undefined,
    });
    expect(seen[0].prompt).toContain("A person story naming J. E. Ellmore");
    expect(seen[0].prompt).not.toContain("1889-90");
    expect(seen[0].imageDataUrl).toBeDefined();
  });
});
