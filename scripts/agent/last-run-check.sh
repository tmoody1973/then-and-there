#!/usr/bin/env bash
# Read-only (2026-11-02): did the last agent run's Editor pass a find, and did a real note go out?
# Prints times and pass/replay flags only, never names, readers or claims.
set -euo pipefail
cd "$(dirname "$0")/../.."

CONVEX_DEPLOY_KEY=$(sed -n "s/^CONVEX_DEPLOY_KEY=//p" .env.convex-prod)
[ -n "$CONVEX_DEPLOY_KEY" ] || { echo "CONVEX_DEPLOY_KEY missing from .env.convex-prod" >&2; exit 1; }
export CONVEX_DEPLOY_KEY

show() {
  echo "== $1 (newest $2, times UTC)"
  bunx convex data "$1" --limit "$2" --order desc --format jsonLines 2>/dev/null | python3 -c '
import sys, json, datetime
for l in sys.stdin:
    if not l.startswith("{"):
        continue
    r = json.loads(l)
    t = datetime.datetime.fromtimestamp(r["_creationTime"] / 1000, datetime.timezone.utc).strftime("%m-%d %H:%M")
    print(t, "kind=%s" % r.get("subjectKind", "-"), "pass=%s" % r.get("pass", "-"), "replay=%s" % r.get("replay", "-"))
'
}

show editorRuns 3
show notes 3
