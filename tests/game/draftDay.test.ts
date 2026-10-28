import { describe, expect, test } from "vitest";
import { draftDay, passage, type Clip } from "../../lib/game/draftDay";

const clip = (id: string, date: string, text: string): Clip => ({
  clippingId: id, pageId: `p-${id}`, iiifBase: "https://iiif/x", box: { x: 0, y: 0, w: 10, h: 10 },
  paper: "The Evening World", date, citationMla: "MLA", text,
});
const CLUES = [clip("clue", "1889-11-28", "Her steamer cleared the Suez Canal, southbound.")];
const REVEAL = clip("rev", "1889-12-03", "Nellie Bly arrived at Aden on the Victoria.");
const DRAFT = JSON.stringify({
  title: "Through the Red Sea",
  question: { kind: "choice", prompt: "Where will she next touch land?", options: ["Aden", "Bombay", "Colombo"], answerIndex: 0 },
  hints: ["Where do steamers coal after the Red Sea?", "Which port guards its southern mouth?"],
  explanation: "The papers reported she arrived at Aden on the Victoria.",
  answerStatement: "Nellie Bly arrived at Aden on the Victoria.",
});

function deps(verdicts: boolean[] = []) {
  const claims: string[] = [];
  let i = 0;
  return {
    claims,
    d: {
      complete: async () => DRAFT,
      verify: async (input: { claim: string }) => {
        claims.push(input.claim);
        const pass = verdicts[i++] ?? true;
        return { pass, reason: pass ? "ok" : `check ${i} failed` };
      },
      verifySolvable: async (input: { question: string }) => {
        claims.push(input.question);
        const pass = verdicts[i++] ?? true;
        return { pass, reason: pass ? "ok" : `check ${i} failed` };
      },
      verifyHint: async (input: { hint: string }) => {
        claims.push(input.hint);
        const pass = verdicts[i++] ?? true;
        return { pass, reason: pass ? "ok" : `check ${i} failed` };
      },
    },
  };
}

describe("draftDay", () => {
  test("publishes when every Editor check passes", async () => {
    const { d, claims } = deps();
    const row = await draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, REVEAL], d);
    expect(row.status).toBe("published");
    expect(claims).toHaveLength(5);
    expect(row.date1889).toBe("1889-11-29");
    expect(row.clue.excerpt).toContain("Suez");
    expect(row.reveal.explanation).toContain("Aden");
  });

  test("excerpts center on the Bly mention, not the column's first item", async () => {
    const mixed = clip("rev", "1889-12-03", "The Brazilian minister will not resign. ".repeat(20) + "Nellie Bly arrived at Aden on the Victoria.");
    const row = await draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, mixed], deps().d);
    expect(row.reveal.excerpt).toContain("Nellie Bly arrived at Aden");
    expect(row.reveal.excerpt.length).toBeLessThanOrEqual(320);
  });

  test("the solvability claim names no date (clippings rarely print a year)", async () => {
    const { d, claims } = deps();
    await draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, REVEAL], d);
    expect(claims[0]).not.toMatch(/18[89]\d/);
  });

  test("passage keeps the text around mentions and drops the rest of a long column", () => {
    const text = "Unrelated wire item. ".repeat(200) + "Nellie Bly reached Hong Kong two days ahead. " + "More wire. ".repeat(200);
    const p = passage(text);
    expect(p).toContain("Nellie Bly reached Hong Kong");
    expect(p.length).toBeLessThanOrEqual(1400);
  });

  test("the answer check uses the answer statement against the reveal, not the question", async () => {
    const seen: Array<{ claim: string; sourceText: string }> = [];
    const { d } = deps();
    const wrapped = { ...d, verify: async (input: { claim: string; sourceText: string }) => (seen.push(input), d.verify(input)) };
    await draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, REVEAL], wrapped);
    expect(seen[0].claim).toBe("Nellie Bly arrived at Aden on the Victoria.");
    expect(seen[0].sourceText).toContain("arrived at Aden");
    expect(seen[1].sourceText).toContain("Suez");
    expect(seen[1].sourceText).toContain("arrived at Aden");
  });

  test("passes curator guidance to the Case Writer only when a pick has it", async () => {
    const prompts: string[] = [];
    const { d } = deps();
    const spy = { ...d, complete: async (req: { prompt: string }) => (prompts.push(req.prompt), d.complete()) };
    await draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "", guidance: "Hints must not mention her lead in days." }, [...CLUES, REVEAL], spy);
    await draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, REVEAL], spy);
    expect(prompts[0]).toContain("Hints must not mention her lead in days.");
    expect(prompts[1]).not.toContain("CURATOR GUIDANCE");
  });

  test("rejects with reasons when one check fails", async () => {
    const { d } = deps([true, false]);
    const row = await draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, REVEAL], d);
    expect(row.status).toBe("rejected");
    expect(row.rejectReasons.join(" ")).toContain("check 2 failed");
  });

  test("refuses a clue dated after the day (no hindsight)", async () => {
    const late = [clip("clue", "1889-11-30", "too late")];
    await expect(
      draftDay({ day: 16, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...late, REVEAL], deps().d),
    ).rejects.toThrow(/hindsight/);
  });

  test("finale day without a printed time is rejected", async () => {
    const row = await draftDay({ day: 73, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, REVEAL], deps().d);
    expect(row.status).toBe("rejected");
    expect(row.rejectReasons.join(" ")).toMatch(/finale time/);
  });

  test("finale day stores the printed time", async () => {
    const rev = clip("rev", "1890-01-26", "She made the circuit in 72 days, 6 hours, 11 minutes, 14 seconds.");
    const row = await draftDay({ day: 73, clueClippingIds: ["clue"], revealClippingId: "rev", note: "" }, [...CLUES, rev], deps().d);
    expect(row.finaleSeconds).toBe(72 * 86400 + 6 * 3600 + 11 * 60 + 14);
  });
});
