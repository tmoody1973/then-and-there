// A private key kept in the browser owns this reader's follows and notes (decision 009: no accounts).
export const AGENT_KEY = "tt.agent.key.v1";
export const KEY_PATTERN = /^[0-9a-f]{32}$/;

export function agentKey(store: Pick<Storage, "getItem" | "setItem">): string {
  const stored = store.getItem(AGENT_KEY);
  if (stored && KEY_PATTERN.test(stored)) return stored;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  store.setItem(AGENT_KEY, key);
  return key;
}
