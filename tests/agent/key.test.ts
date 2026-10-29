import { describe, expect, test } from "vitest";
import { agentKey, AGENT_KEY } from "../../lib/agent/key";
import { normalizePlace } from "../../lib/agent/places";

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe("agentKey", () => {
  test("agentKey keeps a valid stored key and replaces a malformed one", () => {
    const good = "0123456789abcdef0123456789abcdef";
    expect(agentKey(mem({ [AGENT_KEY]: good }))).toBe(good);
    const s = mem({ [AGENT_KEY]: "not-a-key" });
    const k = agentKey(s);
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(s.m.get(AGENT_KEY)).toBe(k);
    expect(agentKey(mem())).not.toBe(agentKey(mem()));
  });
});

describe("normalizePlace", () => {
  test("accepts Midwest states and the three anchor cities, case-insensitively", () => {
    expect(normalizePlace("  Wisconsin ")).toBe("wisconsin");
    expect(normalizePlace("Milwaukee")).toBe("milwaukee");
    expect(normalizePlace("Atlantis")).toBeNull();
  });
});
