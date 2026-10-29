# Explore + Light Personal Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second door (a Story Finder over the processed corpus: search, open the scan, cite, follow) and the light agent (remembers follows, works nightly, sends at most one Editor-verified note, keeps an honest activity log).

**Architecture:** Explore is Convex search queries plus one Next.js route. The agent is a Bun script run nightly by GitHub Actions: it re-picks "meanwhile" for the game clock's next date, diffs the Library's batch list, scans new batches' OCR for follows locally, processes only hit pages with the existing pipeline, asks the Editor about each candidate, and writes notes and activity lines to Convex. Follows belong to a private browser key, not an account.

**Tech Stack:** Next.js 16 (App Router), Convex, Bun, Vitest + convex-test, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-28-then-and-there-design.md` (sections 5, 6, 7.2, 9, 15). Decisions: `docs/decisions/003`, `004`, `009`.

## Global Constraints

- Everything shown in Explore or the agent is **pre-1931** (date < `1931-01-01`).
- **No model calls on the judging path.** Explore results, verified badges and teacher packs are pre-generated; only the nightly job calls models, and it logs `skipped: no credits` instead of failing if credits run out.
- **Users' follow lists never go to Meta's models.** Matching runs in our code; the Editor receives only the clipping text, its crop and the matched span. Never the follow list, never the browser key.
- **Every claim reaching a user passed the Editor** (spec 2, 7.2). Machine-repaired transcription is labeled "machine-repaired text" with the scan beside it; model labels without an Editor pass are labeled "machine-sorted" (decision 009).
- **Hard history:** shown with a calm, fixed-copy content note (never model-written), never hidden, never decorated. Teacher packs exclude flagged clippings unless the teacher opts in.
- **At most one note per browser key per night**, only for an Editor-confirmed find. Replayed batches are labeled "Replay" on every note and log line (spec 6.3).
- **Public logs print counts only.** The GitHub Actions log never contains a follow value or a browser key.
- **Polite to the Library:** bulk batch downloads ≤ 10 per 10 minutes; page fetches go through `createLocClient` (existing limits and block pause).
- **Design:** all UX through the `/impeccable` skill, Copy Desk tokens in `app/globals.css`; phone (375px) and laptop (1440px); WCAG 2.2 AA. Never anything that resembles Carmen Sandiego; the guide is "the City Editor."
- Convex writes and script-only reads require `CONVEX_WRITE_SECRET` (existing `requireSecret`); browser-owned data (follows, notes, seen) is gated by the browser key instead.
- Spend: `--budget` hard stop on every model-calling script; nightly cap $3.

## Review Focus

1. **A common followed name ("Smith") hits hundreds of pages in one batch** → candidates are capped per night (`MAX_CANDIDATE_PAGES = 5`), one note per key, the rest logged as a count. Test in Task 5.
2. **A batch download is truncated or its checksum doesn't match `ocr.json`'s `sha256`** → the batch is skipped, logged, and *not* marked seen, so the next night retries it. Test in Task 6.
3. **The same clipping matches on two nights** → no second note for that key (notes dedupe on key + clippingId). Test in Task 5.
4. **A new batch contains 1931-or-later pages** → never matched, never processed. Test in Task 6.
5. **Activity lines and console output leak follows** → log formatter emits counts only; a test feeds distinctive follow values and asserts none appear in printed output. Test in Task 7.

---

### Task 1: Spike — what's inside a batch bundle

Research, not product code. One download of the smallest recent batch (`fu_three_ver02`, 91.8 MB, checked 2026-10-28) answers what Tasks 5–6 need.

**Files:**
- Create: `tests/fixtures/batch/` (3–5 pages' OCR files copied out of the bundle, plus the batch XML trimmed to those pages)
- Create: `.superpowers/spike/batch-notes.md` (gitignored)

- [ ] **Step 1:** Download `https://chroniclingamerica.loc.gov/data/ocr/fu_three_ver02.tar.bz2` once with the descriptive User-Agent, verify its sha256 against `.superpowers/spike/ocr.json`, list the archive (`tar -tjf`) without extracting everything.
- [ ] **Step 2:** Record in `batch-notes.md`: the per-page file names (`ocr.txt`? `ocr.xml`?), how a path maps to lccn / date / edition / sequence, how to turn that into our `pageId` (`http://www.loc.gov/resource/<lccn>/<date>/ed-<n>/?sp=<seq>`), whether place metadata is inside or needs one loc.gov call per lccn, and the uncompressed size.
- [ ] **Step 3:** Copy 3–5 pages' OCR (at least one pre-1931 and, if present, one 1931+) into `tests/fixtures/batch/`, keeping the archive's directory layout.
- [ ] **Step 4:** Ledger ruling: the page-text source (ALTO vs txt) and the pageId mapping. If place metadata needs loc.gov calls, rule that they go through `createLocClient().getPageJson` and are cached per lccn.
- [ ] **Step 5:** Commit the fixtures: `git commit -m "test: batch bundle fixture from fu_three_ver02"`.

### Task 2: Explore search backend

**Files:**
- Modify: `convex/schema.ts` (add `.searchIndex("search_raw", { searchField: "rawText", filterFields: ["type"] })` to `clippings`)
- Create: `convex/explore.ts`, `lib/explore/communities.ts`
- Test: `tests/convex/explore.test.ts`

**Interfaces:**
- Produces: `explore.search` (public query) args `{ q: string; state?: string; city?: string; from?: string; to?: string; language?: string; community?: "black-press"; frontOnly?: boolean; peopleOnly?: boolean; verifiedOnly?: boolean }` → `ExploreCard[]` (max 30), where
  `ExploreCard = { clippingId, pageId, iiifBase, box, paper, city, state, date, sequence, language: string[], type?, textKind: "repaired" | "archive", text, editorStatus, hardHistory: boolean, citeThis: { apa, chicago, mla } }`.
- Produces: `BLACK_PRESS_LCCNS: string[]` in `lib/explore/communities.ts`: only titles present in our `pages` table AND confirmed as Black-press by the title's own loc.gov record (Wisconsin Weekly Advocate, Detroit Plaindealer, New York Age if present). Each entry carries a comment with its source URL. Spec 5 flags Chicago's Broad Ax as unverified; don't add unverified titles.
- Produces: `explore.stats` (public query) → `{ pages: number }` (processed pages, for "Searching N processed pages").

- [ ] **Step 1: Write failing tests** in `tests/convex/explore.test.ts` (seed pages + clippings with the existing `PAGE`-style helpers):
  - `finds a word that exists only in raw OCR (unrepaired clipping), labeled textKind "archive"`
  - `prefers the repaired text and labels it "repaired" when both match`
  - `returns each clipping once when both indexes match it`
  - `filters by state, date range, language and front page (sequence 1)`
  - `community "black-press" keeps only pages whose lccn is in BLACK_PRESS_LCCNS`
  - `peopleOnly keeps type "person"; verifiedOnly keeps editorStatus "pass"`
  - `never returns a page dated 1931-01-01 or later`
  - `empty, whitespace-only or >200-character q returns [] without throwing`
  - `caps results at 30`
  - `stats counts processed pages only`
- [ ] **Step 2:** Run `bun run test tests/convex/explore.test.ts`. Expected: FAIL (`explore` module missing).
- [ ] **Step 3: Implement** `convex/explore.ts`. Query both search indexes (`take(64)` each, with `type: "person"` filter when `peopleOnly`), merge and dedupe by `_id` keeping search order, join each clipping's page through `pages.by_pageId`, then apply page filters in code (`ponytail:` comment: post-filter of ≤128 hits; denormalize state/date onto clippings if the corpus passes ~50k). `text` = `cleanedText ?? rawText`. Trim `q`; reject empty or > 200 chars.
- [ ] **Step 4:** Run the test file, then `bun run test` and `bun run typecheck`. Expected: all PASS.
- [ ] **Step 5:** Commit: `feat: Explore search over repaired and archive text with page filters`.

### Task 3: Verify the top slice (Explore's "Verified" badge)

**Files:**
- Modify: `convex/clippings.ts` (add secret-gated `setEditorStatus({ secret, clippingId, editorStatus })` and secret-gated `topForVerify({ secret, limit })` returning classified clippings ordered by `humanStoryScore` desc with `editorStatus: "unchecked"`)
- Create: `lib/editor/labels.ts`, `scripts/explore/verify.ts`
- Modify: `lib/pipeline/prompts.ts` (add `EDITOR_LABEL_PROMPT`; do NOT bump `PROMPT_VERSION`)
- Test: `tests/editor/labels.test.ts`, `tests/convex/store.test.ts` (setEditorStatus refused without secret)

**Interfaces:**
- Produces: `labelClaim(c: { type: string; people: string[] }): string`, e.g. `A person story naming Mrs. J. E. Ellmore` / `An event story` when people is empty.
- Produces: `verifyLabel(input: { clippingId: string; type: string; people: string[]; text: string; cropUrl: string }, deps) → Promise<{ pass: boolean; reason: string }>` built on `verifyClaim` with `subjectKind: "clipping"`.

- [ ] **Step 1: Write failing tests:** `labelClaim names up to 3 people and the type`; `verifyLabel fails closed when the model is unreachable` (fake `complete` throws → `{ pass: false, reason: "editor-unavailable" }`); `setEditorStatus is refused without the secret`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement.** `scripts/explore/verify.ts --budget 5 [--limit 400]`: loads `topForVerify`, runs `verifyLabel` with `mapPool` (concurrency 4), writes `setEditorStatus`, stops at the budget using the existing spend tracking (`costOf` + `onUsage`), prints `verified N: P pass, F fail, $X`.
- [ ] **Step 4:** `bun run test`, `bun run typecheck`: PASS. Then run `bun scripts/explore/verify.ts --budget 5` against local Convex; record pass/fail counts and spend in the ledger.
- [ ] **Step 5:** Commit: `feat: Editor-verify labels on the top human-story slice (budget-capped)`.

### Task 4: Follows and agent memory (browser key)

**Files:**
- Modify: `convex/schema.ts` (tables below)
- Create: `convex/agent.ts`, `lib/agent/key.ts`, `lib/agent/places.ts`, `lib/agent/types.ts`
- Test: `tests/convex/agent.test.ts`, `tests/agent/key.test.ts`

Tables:
- `follows`: `{ owner: string; kind: "name" | "place"; value: string; createdAt: number }`, index `by_owner`
- `notes`: `{ owner: string; clippingId: string; clip: clipRef; matched: string; replay: boolean; createdAt: number; readAt?: number }`, indexes `by_owner`, `by_owner_clipping`
- `activity`: `{ owner?: string; runId: string; line: string; replay: boolean; createdAt: number }`, index `by_owner` (owner absent = shared nightly line shown to every key)
- `agentState`: `{ key: string; value: string }`, index `by_key` (stores the previous `ocr.json` batch-name list)

**Interfaces:**
- Produces (type): `Follow = { id: string; owner: string; kind: "name" | "place"; value: string }` (exported from `lib/agent/types.ts`).
- Produces (browser): `agentKey(store): string`: 32 lowercase hex chars from `crypto.getRandomValues`, persisted under `tt.agent.key.v1`; regenerated if missing or malformed.
- Produces (public, key-gated): `agent.follow({ key, kind, value })`, `agent.unfollow({ key, id })`, `agent.forgetMe({ key })` (deletes follows, notes, own activity), `agent.mine({ key })` → `{ follows, notes, activity }` (activity = own lines + shared lines, newest 50).
- Produces (secret-gated, for the nightly job): `agent.allFollows({ secret })`, `agent.addNote({ secret, note })` (returns `false` if `by_owner_clipping` already has it), `agent.log({ secret, rows })`, `agent.getState` / `agent.setState`.
- Produces: `PLACES`: the 12 Midwest states plus `milwaukee, wis.`, `chicago, ill.`, `detroit, mich.`; `normalizePlace(value): string | null`.

- [ ] **Step 1: Write failing tests:**
  - `a malformed key is refused` (not 32 hex → throws "bad key")
  - `follow trims, rejects values under 2 or over 60 characters, and caps a key at 20 follows`
  - `a place follow must be a known place`
  - `mine returns only that key's follows and notes`
  - `forgetMe deletes follows, notes and own activity, leaving shared lines`
  - `addNote refuses a duplicate clipping for the same key` (Review Focus 3)
  - `secret-gated agent functions refuse without the secret`
  - `agentKey keeps a valid stored key and replaces a malformed one`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** to the interfaces above. Owner is the key itself (bearer token; no query lists owners publicly).
- [ ] **Step 4:** `bun run test`, `bun run typecheck`: PASS.
- [ ] **Step 5:** Commit: `feat: follows, notes and activity log owned by a private browser key`.

### Task 5: The night's logic (pure, tested)

**Files:**
- Create: `lib/agent/match.ts`, `lib/agent/night.ts`, `lib/agent/clock.ts`
- Modify: `lib/game/pickMeanwhile.ts` (add `city` and `national` scopes and top-3 per scope)
- Modify: `convex/meanwhile.ts` (`forDay` gains optional `exclude: string[]` (≤ 50 ids) and `city?: string`; returns the first unexcluded row, falling back city → state → Midwest → national, with `fellBackFrom`)
- Test: `tests/agent/match.test.ts`, `tests/agent/night.test.ts`, `tests/agent/clock.test.ts`, extend `tests/game/pickMeanwhile.test.ts`, extend `tests/convex/game.test.ts`

**Interfaces:**
- Produces: `matchName(text: string, name: string): string | null`: case-insensitive whole-word match, collapses whitespace and line-break hyphens, tolerates one character's edit inside a name of 6+ letters (`Ellm0re` matches `Ellmore`); returns the matched span as printed.
- Produces: `gameClockDate(today: string, publishedDays: number[]): string`: before `2026-11-14`, the 1889 date of the next published demo day (cycling); from launch on, `date1889ForDay(liveDayOn(today) + 1)` (tomorrow's dispatch).
- Produces: `matchPage(page: { pageId: string; date: string; state: string; city: string; text: string }, follows: Follow[]): Hit[]` where `Hit = { pageId: string; owner: string; followId: string; matched: string }`. Called once per page as the archive streams; never holds a batch in memory. Pages dated 1931+ return `[]`.
- Produces: `pickCandidates(hits: Hit[]): { pages: Array<{ pageId: string; hits: Hit[] }>; capped: number }`: at most `MAX_CANDIDATE_PAGES = 5` pages, ranked by distinct owners matched; `capped` counts the pages left out.
- Produces: `activityLine(s: { batches: number; pages: number; follows: number; candidates: number; confirmed: number; notes: number; replay: boolean }): string` →
  `Checked 2 new batches (7,907 pages). Searched 3 follows. 1 candidate. Editor confirmed 1. Sent 1 note.` with a `Replay: ` prefix when `replay`.

- [ ] **Step 1: Write failing tests,** including:
  - `matchName finds "J. E. Ellmore" across a line-break hyphen and returns the printed span`
  - `matchName tolerates one OCR error in a long name but not in "Bly"`
  - `matchName does not match inside a longer word ("Blythe" for "Bly")`
  - `pickCandidates caps a common name at 5 candidate pages and counts the rest` (Review Focus 1)
  - `matchPage ignores pages dated 1931 or later` (Review Focus 4)
  - `matchPage matches a place follow by page state or city`
  - `gameClockDate before launch cycles through published demo days; after launch it is tomorrow's dispatch`
  - `activityLine pluralizes, and prefixes "Replay: "`
  - `pickMeanwhile adds city scopes for the three anchor cities and a national scope, top 3 each`
  - `forDay skips excluded ids and falls back city → state → Midwest → national`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** to the interfaces. Existing `forDay` callers keep working (new args optional).
- [ ] **Step 4:** `bun run test`, `bun run typecheck`: PASS.
- [ ] **Step 5:** Commit: `feat: the agent's night: OCR-tolerant matching, candidate caps, game clock, wider meanwhile`.

### Task 6: Batch scanning

**Files:**
- Create: `worker/agent/batches.ts`
- Test: `tests/worker/batches.test.ts` (uses Task 1's fixture)

**Interfaces:**
- Consumes: Task 1's mapping rulings; `createLocClient`.
- Produces (type, in `lib/agent/types.ts`): `BatchEntry = { batch: string; ingested: string; page_count: number; sha256: string; size: number; url: string }` (the `ocr.json` fields we use).
- Produces: `newBatches(prev: string[], list: BatchEntry[], opts?: { replay?: string }): BatchEntry[]`: entries whose `batch` isn't in `prev`; with `replay`, exactly that named batch (already-seen allowed).
- Produces: `downloadBatch(entry: BatchEntry, dir: string, deps: { fetchImpl; sleep }) → Promise<string>`: streams to disk, verifies `sha256`, throws `BatchChecksumError` on mismatch or truncation, waits so bulk downloads stay ≤ 10 per 10 minutes.
- Produces: `readBatchPages(archivePath: string) → AsyncIterable<{ pageId: string; lccn: string; date: string; text: string }>`: streams the archive (`tar -xjOf` per member or a streaming reader, per Task 1's ruling), skipping 1931+ pages without reading their text.

- [ ] **Step 1: Write failing tests:**
  - `newBatches returns unseen batches; replay returns the named batch even if seen`
  - `downloadBatch rejects a checksum mismatch and leaves no file` (Review Focus 2)
  - `downloadBatch rejects a truncated body` (Review Focus 2)
  - `readBatchPages maps archive paths to pageIds and skips 1931+ pages` (fixture; Review Focus 4)
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Bulk-download pacing: one shared `takeSlot`-style limiter, 10 per 600,000 ms.
- [ ] **Step 4:** `bun run test`, `bun run typecheck`: PASS.
- [ ] **Step 5:** Commit: `feat: download, verify and read Library batch bundles`.

### Task 7: The nightly job and its schedule

**Files:**
- Create: `worker/agent/night.ts` (CLI), `.github/workflows/agent.yml`
- Test: `tests/worker/night.test.ts`

**Interfaces:**
- Consumes: Tasks 4–6; `processPage` (existing, for hit pages: fetch metadata via the Library client, then segment/clean/classify/store); `verifyClaim` with `subjectKind: "find"`; `pickMeanwhile`; `agent.*` and `meanwhile.replaceForDate` (secret-gated).
- Produces: `NightDeps = { listBatches(): Promise<BatchEntry[]>; download(e: BatchEntry): Promise<string>; pages(archive: string): AsyncIterable<BatchPage>; placeOf(lccn: string): Promise<{ state: string; city: string }>; processPage(pageId: string): Promise<ClippingRow[]>; verifyFind(input: { clippingId: string; text: string; matched: string; cropUrl: string }): Promise<{ pass: boolean; reason: string }>; store: { follows; addNote; log; getState; setState; replaceMeanwhile }; print(line: string): void }`. Every outside effect goes through `deps`, so tests run with fakes.
- Produces: `runNight(deps: NightDeps, opts: { today: string; replay?: string; budget: number }) → Promise<NightSummary>` where `NightSummary = { batches, pages, follows, candidates, confirmed, notes, skipped: string[] }`.

Order inside `runNight`: (1) meanwhile for `gameClockDate`; (2) batch list → `newBatches`; (3) for each batch: download, stream pages through `matchPage`, collect hits, then `pickCandidates`; (4) process candidate pages (≤ 5); (5) for each owner on a page: find the clipping containing the match (`matchName` on `cleanedText ?? rawText`), Editor `verifyClaim({ subjectKind: "find", claim: `This clipping mentions ${matched}`, sourceText: clipping text, cropUrl })`. The claim carries only the matched span; (6) `addNote` for the first confirmed find per owner; (7) write one shared activity line plus one per owner who got a note; (8) `setState` with the new batch list, excluding batches that failed. Out of credits → `skipped: ["no credits"]`, still logs.

- [ ] **Step 1: Write failing tests** with fake deps:
  - `one note per owner per night even with two confirmed finds`
  - `an Editor fail sends no note and the line says "Editor confirmed 0"`
  - `a failed batch is not saved as seen` (Review Focus 2)
  - `nothing printed or sent to the Editor contains a follow value or a key`: seed follows `Zyxwvut` and key `aaaa…`, capture stdout and every Editor request; assert absent except the matched span inside a confirmed clipping's own text (Review Focus 5)
  - `replay labels every note and line`
  - `out of credits logs "skipped: no credits" and exits 0`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** `runNight` and the CLI (`bun worker/agent/night.ts [--replay <batch>] [--budget 3]`, env from `.env` locally / Actions secrets in CI). `.github/workflows/agent.yml`: `schedule: cron "0 7 * * *"` (2–3 AM ET), `workflow_dispatch` with optional `replay` input, `permissions: contents: read`, Bun 1.3.14, secrets `META_API_KEY`, `CONVEX_URL`, `CONVEX_WRITE_SECRET`, vars for the `META_*` model names; `timeout-minutes: 60`.
- [ ] **Step 4:** `bun run test`, `bun run typecheck`: PASS. Local dry run: `bun worker/agent/night.ts --replay curiv_biddymason_ver01 --budget 3` against local Convex with one real follow; record the activity line in the ledger.
- [ ] **Step 5:** Commit: `feat: nightly agent job (GitHub Actions) with replay mode`.

### Task 8: Explore and Your Desk screens

**Files:**
- Create: `app/explore/page.tsx`, `app/explore/explore.css`, `app/desk/page.tsx`, `components/ExploreCard.tsx`, `components/CiteButton.tsx`, `components/FollowButton.tsx`, `lib/agent/useAgent.ts`
- Modify: `app/page.tsx` (two doors: Play and Explore), `components/Meanwhile.tsx` (pass `exclude` from browser-seen ids and a followed city/state)
- Test: `e2e/explore.spec.ts`

Use `/impeccable` for both screens before coding (Copy Desk world; Explore is Operate mode, the desk is Read mode).

Behavior:
- Explore: search box, filters (state, city, from/to dates, language, front pages, people only, verified only), "Searching N processed pages." Cards: `ScanCrop` of the clipping, text with query terms marked, a text label ("Machine-repaired text" / "Archive OCR text"), type shown as "Verified: person story" when `editorStatus === "pass"` else "Machine-sorted: person", hard-history note (fixed copy: *"This item reflects attitudes or language of its time. It is shown as printed, as a historical record."*), **Open scan** (loc.gov page), **Cite** (APA / Chicago / MLA from `citeThis` plus "page N, clipping at x,y" copied to the clipboard), **Follow** (the place, or a person named on a verified card).
- Your Desk: follows (remove each, "Forget everything"), notes (newest first, `Replay` label when set, each with its scan and citation), activity log. Empty state explains what the agent does nightly and that follows never leave our servers for an AI model.
- Seen ids (`tt.seen.v1`, last 200) are recorded from Meanwhile and notes.
- **Save** on every card and note (spec 6.1 "saved clippings"): stored in the browser (`tt.saved.v1`, the card's `clipRef`, max 100), listed on Your Desk with remove; "Forget everything" clears it too.

- [ ] **Step 1: Write failing E2E** (`e2e/explore.spec.ts`, iPhone 13):
  - `searching "Bly" shows cards with a scan, a text label and a Cite button`
  - `following a place from a card lists it on Your Desk, and Forget everything empties it`
  - `a saved card appears on Your Desk and can be removed`
  - `when the image server is down, a card still shows its text and citation`
- [ ] **Step 2:** `bunx playwright test e2e/explore.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** per the impeccable direction.
- [ ] **Step 4:** E2E PASS; `bun run test`, `bun run typecheck`, `bun run build`; screenshots at 375 and 1440 for both screens, one fix round.
- [ ] **Step 5:** Commit: `feat: Explore and Your Desk screens`.

### Task 9: Teacher pack (first to cut if behind; spec 9 cut order)

**Files:**
- Create: `scripts/explore/packs.ts`, `convex/packs.ts`, `app/explore/pack/[slug]/page.tsx`
- Modify: `convex/schema.ts` (`packs`: `{ slug, title, theme, items: clipRef[], questions: string[], includesHardHistory: boolean }`), `lib/pipeline/prompts.ts` (`PACK_QUESTIONS_PROMPT`)
- Test: `tests/explore/packs.test.ts`

Three packs, pre-generated: "Racing Nellie Bly (1889–90)," "Milwaukee's Black press," "German Milwaukee." Up to 8 verified clippings each; 3 discussion questions from Muse Spark, each Editor-checked (`subjectKind: "question"`); a failed question is regenerated once, then dropped. Printable page (print CSS). Hard-history clippings excluded unless the page's "include hard history" toggle is on (and then shown with the fixed note).

- [ ] **Step 1: Write failing tests:** `a pack holds at most 8 items, all editorStatus "pass"`; `flagged clippings are excluded by default`; `a question that fails the Editor twice is dropped`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement**; generate with `bun scripts/explore/packs.ts --budget 1`.
- [ ] **Step 4:** Tests, typecheck, build PASS; print preview screenshot.
- [ ] **Step 5:** Commit: `feat: printable teacher packs with Editor-checked questions`.

### Task 10: Ship to production and start the clock

Needs Tarik's go for: setting GitHub Actions secrets, deploying Convex functions to production, enabling the schedule.

- [ ] **Step 1:** `CONVEX_DEPLOY_KEY=… bunx convex deploy` (new tables and indexes). Copy verified badges and packs to production (snapshot + `convex import --replace` of `clippings`, `packs`, `meanwhile`; follows/notes stay empty in prod).
- [ ] **Step 2:** `gh secret set` for `META_API_KEY`, `CONVEX_URL`, `CONVEX_WRITE_SECRET` (prod values, piped from the gitignored env files, never printed); `gh variable set` for model names.
- [ ] **Step 3:** Trigger `workflow_dispatch` with `replay=curiv_biddymason_ver01` against a real follow; confirm the note appears on the live Desk labeled Replay and the run's public log shows counts only.
- [ ] **Step 4:** Leave the schedule on. Night 1 and night 2 (Sat Oct 31, Sun Nov 1): check each run's log against the Desk's activity log; record both in the ledger. This is the Option B gate evidence (spec 6.4), decided Mon Nov 2.
- [ ] **Step 5:** `BASE_URL=https://then-and-there-flame.vercel.app bunx playwright test`: all E2E PASS on production. Update README (Explore, agent, measured verify numbers) in the same PR.
