// The finale: players guess Bly's exact time, as readers did in The World's 1889 contest.
const UNITS: Record<string, number> = { day: 86400, hour: 3600, minute: 60, second: 1 };

export function parseDuration(text: string): number {
  const parts = [...text.matchAll(/(\d+)\s*(day|hour|minute|second)s?\b/gi)];
  if (!parts.length) throw new Error(`no duration found in text: ${text.slice(0, 80)}`);
  return parts.reduce((sum, m) => sum + Number(m[1]) * UNITS[m[2].toLowerCase()], 0);
}

export function finaleResult(guessSeconds: number, actualSeconds: number): { offBySeconds: number; label: string } {
  const off = Math.abs(guessSeconds - actualSeconds);
  if (off === 0) return { offBySeconds: 0, label: "exactly right" };
  const d = Math.floor(off / 86400);
  const h = Math.floor((off % 86400) / 3600);
  const m = Math.floor((off % 3600) / 60);
  const s = off % 60;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const pieces = [d && plural(d, "day"), h && plural(h, "hour"), m && plural(m, "minute")].filter(Boolean) as string[];
  return { offBySeconds: off, label: `off by ${pieces.length ? pieces.join(" ") : plural(s, "second")}` };
}
