import { beforeAll, describe, expect, test } from "vitest";
import type { EditorRun } from "../../convex/editorRuns";
import { verifyClaim, verifyHint } from "../../lib/editor/verify";

beforeAll(() => {
  process.env.META_MODEL_EDITOR = "editor-model";
});

const INPUT = {
  subjectKind: "clue" as const,
  subjectId: "day16-clue",
  claim: "The World offered a free trip to Europe for the nearest guess of Bly's time.",
  sourceText: "A FREE TRIP TO EUROPE for the NEAREST GUESS as to the Exact Time of NELLIE BLY'S TOUR.",
  cropUrl: "https://iiif/x/0,0,10,10/!1600,3200/0/default.jpg",
};

function deps(reply: string | Error) {
  const logged: EditorRun[] = [];
  const prompts: string[] = [];
  return {
    logged,
    prompts,
    d: {
      complete: async (req: { model: string; prompt: string; imageDataUrl?: string }) => {
        prompts.push(req.prompt);
        if (reply instanceof Error) throw reply;
        return reply;
      },
      loadImage: async () => "data:image/jpeg;base64,AA",
      log: async (run: EditorRun) => {
        logged.push(run);
      },
    },
  };
}

describe("verifyClaim", () => {
  test("passes when the model passes, and logs it", async () => {
    const { d, logged } = deps('{"pass": true, "reason": "stated in the banner"}');
    expect(await verifyClaim(INPUT, d)).toEqual({ pass: true, reason: "stated in the banner" });
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ pass: true, subjectKind: "clue", subjectId: "day16-clue", model: "editor-model" });
  });

  test("fails closed on malformed output", async () => {
    const { d, logged } = deps("yes");
    expect(await verifyClaim(INPUT, d)).toEqual({ pass: false, reason: "unparseable" });
    expect(logged[0].pass).toBe(false);
  });

  test("fails closed when the model is unreachable", async () => {
    const { d, logged } = deps(new Error("ECONNRESET"));
    expect(await verifyClaim(INPUT, d)).toEqual({ pass: false, reason: "editor-unavailable" });
    expect(logged[0].reason).toBe("editor-unavailable");
  });

  test("prompt carries only the claim and the source", async () => {
    const { d, prompts } = deps('{"pass": false, "reason": "not on page"}');
    await verifyClaim(INPUT, d);
    expect(prompts[0]).toContain(INPUT.claim);
    expect(prompts[0]).toContain(INPUT.sourceText);
    expect(prompts[0].toLowerCase()).not.toContain("draft");
  });
});

describe("verifyHint", () => {
  test("passes a hint that doesn't give the answer away, with no image", async () => {
    const { d, logged, prompts } = deps('{"pass": true, "reason": "asks a question only"}');
    const res = await verifyHint({ subjectId: "day16-hint1", hint: "Which ocean lies west of San Francisco?", answer: "Yokohama" }, d);
    expect(res.pass).toBe(true);
    expect(prompts[0]).toContain("Yokohama");
    expect(logged[0]).toMatchObject({ subjectKind: "hint", pass: true });
  });

  test("fails closed on malformed output", async () => {
    const { d } = deps("no idea");
    expect(await verifyHint({ subjectId: "h", hint: "x", answer: "y" }, d)).toEqual({ pass: false, reason: "unparseable" });
  });
});
