// Meta Model API prices, USD. Source: https://dev.meta.ai/docs/pricing-rate-limits (2026-10-28).
// Reasoning ("thinking") tokens are billed as output.
type TokenPrice = { input: number; cachedInput: number; output: number }; // per 1M tokens
const TOKEN_PRICES: Record<string, TokenPrice> = {
  "muse-spark-1.3": { input: 1.25, cachedInput: 0.15, output: 4.25 },
  "muse-spark-1.2": { input: 1.25, cachedInput: 0.15, output: 4.25 },
  "muse-spark-1.3-contributor": { input: 0.1, cachedInput: 0.002, output: 0.2 },
  "muse-spark-1.2-contributor": { input: 0.1, cachedInput: 0.002, output: 0.2 },
  "muse-wonder-1.0": { input: 4.0, cachedInput: 0.2, output: 20.0 },
};
const PER_IMAGE: Record<string, number> = { "sam-3.1": 2.5 / 1000 };

export type Usage = { input?: number; cachedInput?: number; output?: number; images?: number };

export function costOf(model: string, u: Usage): number {
  if (model in PER_IMAGE) return (u.images ?? 0) * PER_IMAGE[model];
  const p = TOKEN_PRICES[model];
  if (!p) throw new Error(`no price known for model ${model}`);
  const cached = u.cachedInput ?? 0;
  const uncached = Math.max(0, (u.input ?? 0) - cached);
  return (uncached * p.input + cached * p.cachedInput + (u.output ?? 0) * p.output) / 1_000_000;
}
