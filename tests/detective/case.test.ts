import { describe, expect, test } from "vitest";
import { clueEligible, leaksNext, optionsFor, STOPS } from "../../lib/detective/case";

const at = (name: string) => STOPS.findIndex((s) => s.name === name);

describe("the route", () => {
  test("runs New York to New York, eastward", () => {
    expect(STOPS[0].name).toBe("New York");
    expect(STOPS.at(-1)!.name).toBe("New York");
    expect(at("Colombo")).toBeLessThan(at("Penang"));
    expect(at("Hong Kong")).toBeLessThan(at("Yokohama"));
  });

  test("arrival dates only move forward", () => {
    const dates = STOPS.map((s) => s.arrived);
    expect([...dates].sort()).toEqual(dates);
  });

  test("no distractor is a real stop on the route", () => {
    const names = new Set(STOPS.map((s) => s.name));
    for (const s of STOPS) for (const d of s.distractors) expect(names.has(d)).toBe(false);
  });
});

describe("clueEligible", () => {
  const colombo = at("Colombo");
  test("needs Bly and the place, in the window after she arrived", () => {
    expect(clueEligible({ text: "Nellie Bly is detained at Colombo awaiting a steamer.", date: "1889-12-10" }, colombo)).toBe(true);
    expect(clueEligible({ text: "The steamer is detained at Colombo.", date: "1889-12-10" }, colombo)).toBe(false);
    expect(clueEligible({ text: "Nellie Bly is detained at Colombo.", date: "1889-11-20" }, colombo)).toBe(false);
  });

  test("refuses clippings that name the next stop, the answer", () => {
    const itinerary = "Nellie Bly will go by Colombo, Penang, Singapore and Hong Kong.";
    expect(clueEligible({ text: itinerary, date: "1889-12-10" }, colombo)).toBe(false);
  });

  test("allows stops further ahead: reading the route is the game", () => {
    expect(clueEligible({ text: "Nellie Bly reached Colombo and hopes to see Hong Kong by Christmas.", date: "1889-12-10" }, colombo)).toBe(true);
  });

  test("the home port never counts as a later stop", () => {
    expect(clueEligible({ text: "Nellie Bly, of the New York World, reached Colombo.", date: "1889-12-10" }, colombo)).toBe(true);
  });
});

test("leaksNext spots the answer in any spelling case", () => {
  expect(leaksNext("She sails next for PENANG.", at("Colombo"))).toBe(true);
  expect(leaksNext("She is going east.", at("Colombo"))).toBe(false);
});

describe("optionsFor", () => {
  test("four options: the next stop plus its three distractors", () => {
    const opts = optionsFor(at("Colombo"));
    expect(opts.options).toHaveLength(4);
    expect(opts.options).toContain("Penang");
    expect(opts.options[opts.answerIndex]).toBe("Penang");
  });

  test("the answer does not always sit in the same slot", () => {
    const slots = new Set(STOPS.slice(0, -2).map((_, i) => optionsFor(i).answerIndex));
    expect(slots.size).toBeGreaterThan(1);
  });
});
