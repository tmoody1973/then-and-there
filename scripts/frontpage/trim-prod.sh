#!/usr/bin/env bash
# One-off (2026-11-01): trims Front Page rounds 4 and 3, clue 1, in PRODUCTION. The page cutter had
# glued a neighbor onto each crop ("TERRE HAUTE, Ind., Aug. 25" and "Olympia, June 3, 1887").
# Re-exports prod's rows before each trim because each trim rewrites them. Safe to rerun.
set -euo pipefail
cd "$(dirname "$0")/../.."

CONVEX_DEPLOY_KEY=$(sed -n "s/^CONVEX_DEPLOY_KEY=//p" .env.convex-prod)
[ -n "$CONVEX_DEPLOY_KEY" ] || { echo "CONVEX_DEPLOY_KEY missing from .env.convex-prod" >&2; exit 1; }
export CONVEX_DEPLOY_KEY

export_rows() {
  bunx convex data frontPages --format jsonLines 2>/dev/null | grep '"_id"' > cache/fp-prod.jsonl
  echo "exported $(wc -l < cache/fp-prod.jsonl | tr -d ' ') prod rounds"
}

export_rows
bun scripts/frontpage/trim.ts cache/fp-prod.jsonl 4 1 17,5074,631,565 --prod
export_rows
bun scripts/frontpage/trim.ts cache/fp-prod.jsonl 3 1 214,4330,713,178 --prod
export_rows
