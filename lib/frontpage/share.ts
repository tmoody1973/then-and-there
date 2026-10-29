// The spoiler-free share card: how many clues, how close, how many points.
export function shareText(r: { no: number; revealed: number; total: number; points: number; yearsOff: number; regionRight: boolean }): string {
  const bar = "■".repeat(r.revealed) + "□".repeat(Math.max(0, r.total - r.revealed));
  const year = r.yearsOff === 0 ? "exact" : `${r.yearsOff} off`;
  return `Then & There · Front Page No. ${r.no}\n${bar} ${r.revealed} of ${r.total} clues\nYear: ${year} · Region: ${r.regionRight ? "✓" : "✗"}\n${r.points.toLocaleString("en-US")} points`;
}
