# Then & There — Plan 2: Play ("Race Nellie Bly")

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable, phone-first daily game, "Race Nellie Bly around the world, in real time, 137 years later." It ships ~6 Editor-verified dramatic-stop days in demo mode, a finale contest guess, a spoiler-free share card, and a "how it works" page showing a recorded pipeline run.

**Architecture:** Game content is authored offline by scripts that read Plan 1's processed clippings from Convex. A human-reviewed pick file chooses each day's clue and reveal clippings, Muse Spark drafts the question and hints, the Editor checks every claim, and the result is imported into a `gameDays` table. The Next.js app reads published days from Convex, keeps each player's progress in `localStorage` (no sign-in), and loads scans directly from the Library's IIIF server. Pure game logic (schedule, scoring, progress, share text) lives in `lib/game/` and is unit-tested.

**Tech Stack:** Next.js (App Router) + React, Convex (`convex/react`), Vitest, Playwright (one E2E flow), Bun. Visual design produced with the `/impeccable` skill.

**Spec:** `docs/superpowers/specs/2026-10-28-then-and-there-design.md` (sections 2, 4, 7.2, 7.3, 9, 12, 13, 15). Builds on Plan 1: `docs/superpowers/plans/2026-10-28-engine-pipeline.md`.

## Global Constraints

- Plan 1's constraints still hold (rate limits, no Library calls from user requests, pre-1931 only, Editor fails closed).
- **No unverified claim reaches a player:** a `gameDays` row is served only if `status === "published"`, which requires every Editor check to pass.
- **No hindsight:** a day's clue clipping must be dated on or before that day's 1889 date. The reveal may be later.
- **Never "Carmen Sandiego":** no names, characters, organizations, look or structure from it. The guide is "the City Editor."
- **Hard history:** clippings with `hardHistory: true` are never auto-picked for "meanwhile, back home."
- **Judges never trigger model calls:** everything the app shows is pre-generated (spec 15.5).
- **Scans load from `https://tile.loc.gov/image-services/iiif/...` in the browser** (spec 15.4); never proxied or stored.
- **UX/design: all screens are designed with the `/impeccable` skill** (spec 13). Phone-first; feels like newsprint, not a SaaS dashboard.
- Calendar: Day 1 = 1889-11-14 = live 2026-11-14 (+137 years). Day N's 1889 date = 1889-11-14 + (N−1) days.
- Scoring (Claude's call; spec 4.4 leaves numbers to the builder): start **80** days; wrong call **−3**; each hint **−1**; "beat Nellie" when final days left **> 8** (80 − 72).
- CI (typecheck, tests, build) is in place **before** the first public deploy. Branch protection on `main` is a manual step for Tarik.

## Review Focus

1. **A day opened before its anniversary outside demo mode** → a "this dispatch arrives on <date>" screen. The clue, options and answer must not be in the page payload. Test: Task 4 (`dayForPlayer` returns `locked` with no content).
2. **A refreshed page or double-tap after answering** → shows the stored result; the player can't answer again to improve their score. Test: Task 2 (`recordAnswer` is idempotent per day).
3. **Private browsing / `localStorage` throws or holds corrupt JSON** → the game still plays; progress just isn't kept. Test: Task 2 (`loadProgress` with a throwing or corrupt store).
4. **The share card leaks the answer** (port name, option text) → the share text contains none of the day's option strings. Test: Task 2 (`shareText`).
5. **The Library's image server is down or slow** → the clue text and citation still render; the scan area shows a "scan unavailable, open at loc.gov" fallback. Test: Task 8 Playwright, with the image route aborted.

---

### Task 1: Next.js app shell inside the repo

**Files:**
- Create: `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/ConvexClientProvider.tsx`, `app/globals.css`
- Modify: `package.json` (scripts `dev`, `build`, `start`, `typecheck`), `tsconfig.json` (add `"jsx": "preserve"`, the Next plugin, `include` += `app`, `components`, `next-env.d.ts`)

**Interfaces:**
- Produces: `<ConvexClientProvider>` wrapping the app, reading `process.env.NEXT_PUBLIC_CONVEX_URL`. Routes `/` (placeholder landing with links to `/play` and `/how`).

- [ ] **Step 1:** `bun add next react react-dom` and `bun add -d @types/react @types/react-dom`.
- [ ] **Step 2:** Add `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` to `.env.local` (the local anonymous deployment) and a blank `NEXT_PUBLIC_CONVEX_URL=` line to `.env.example`.
- [ ] **Step 3:** Write the shell files. `ConvexClientProvider` is a client component creating one `ConvexReactClient`.
- [ ] **Step 4: Verify** `bun run build` exits 0, `bun run typecheck` (`tsc --noEmit -p .`) exits 0, and `bun run test` is still green (86+).
- [ ] **Step 5:** Commit: `feat: Next.js app shell with Convex provider`.

---

### Task 2: Game logic: schedule, scoring, progress, share text

**Files:**
- Create: `lib/game/types.ts`, `lib/game/schedule.ts`, `lib/game/scoring.ts`, `lib/game/progress.ts`, `lib/game/share.ts`
- Test: `tests/game/schedule.test.ts`, `tests/game/scoring.test.ts`, `tests/game/progress.test.ts`, `tests/game/share.test.ts`

**Interfaces:**
- Produces:
  - `type Question = { kind: "choice"; prompt: string; options: string[]; answerIndex: number } | { kind: "days"; prompt: string; answerDays: number; tolerance: number }`
  - `type DayResult = { correct: boolean; hintsUsed: number; answeredOn: string /*YYYY-MM-DD*/ }`
  - `type Progress = { days: Record<number, DayResult>; finale?: { guessSeconds: number; answeredOn: string } }`
  - `schedule.ts`: `dayNumberFor1889(date: string): number`, `date1889ForDay(day: number): string`, `anniversaryForDay(day: number): string`, `liveDayOn(today: string): number` (0 before launch), `isUnlocked(day: number, today: string, demo: boolean): boolean`
  - `scoring.ts`: `START_DAYS = 80`, `WRONG_COST = 3`, `HINT_COST = 1`, `BEAT_NELLIE_ABOVE = 8`, `isCorrect(q: Question, answer: number): boolean`, `daysLeft(p: Progress): number`, `beatNellie(p: Progress): boolean`
  - `progress.ts`: `PROGRESS_KEY = "tt.progress.v1"`, `loadProgress(store: Pick<Storage,"getItem">): Progress`, `saveProgress(store: Pick<Storage,"setItem">, p: Progress): void` (swallows storage errors), `recordAnswer(p: Progress, day: number, r: DayResult): Progress`, `streak(p: Progress, today: string): number`
  - `share.ts`: `shareText(day: number, r: DayResult, p: Progress): string`
- [ ] **Step 1: Write failing tests.**
  - `dayNumberFor1889("1889-11-14") === 1`; `dayNumberFor1889("1889-11-29") === 16`; `date1889ForDay(73) === "1890-01-25"`; `anniversaryForDay(1) === "2026-11-14"`; `anniversaryForDay(16) === "2026-11-29"`.
  - `liveDayOn("2026-11-13") === 0`; `liveDayOn("2026-11-14") === 1`; `liveDayOn("2027-01-25") === 73`.
  - `isUnlocked(16, "2026-10-30", false) === false`; `isUnlocked(16, "2026-10-30", true) === true`; `isUnlocked(16, "2026-11-29", false) === true`.
  - `isCorrect({kind:"choice",prompt:"",options:["a","b"],answerIndex:1}, 1) === true`; `isCorrect({kind:"days",prompt:"",answerDays:6,tolerance:1}, 7) === true`, and `, 8) === false`.
  - `daysLeft({days:{}}) === 80`; one wrong with 2 hints → `80 - 3 - 2 = 75`; `beatNellie` is true at 9 days left and false at 8.
  - `recordAnswer` returns a new object (input not mutated); recording day 3 twice keeps the first result (Review Focus 2).
  - `loadProgress` with a store whose `getItem` throws → `{days:{}}`; with `"{not json"` → `{days:{}}` (Review Focus 3). `saveProgress` with a throwing `setItem` doesn't throw.
  - `streak`: days 1, 2, 3 answered on their anniversaries, today = day 3's anniversary → `3`; day 2 answered late → `1`.
  - `shareText(16, {correct:true,hintsUsed:1,answeredOn:"2026-11-29"}, p)` contains `"Day 16"` and `"1 hint"`, and contains none of `["Aden","Colombo","Bombay","Zanzibar"]` (Review Focus 4: share text is built only from day, correctness, hints, days left).
- [ ] **Step 2:** `bun run test tests/game`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement. Dates are plain `YYYY-MM-DD` strings computed in UTC (no time-of-day logic).
- [ ] **Step 4:** `bun run test`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat: game schedule, scoring, progress and share text`.

---

### Task 3: Convex tables for game days and "meanwhile" picks

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/gameDays.ts`, `convex/meanwhile.ts`
- Test: `tests/convex/game.test.ts`

**Interfaces:**
- Consumes: Task 2 `Question` shape (mirrored as a Convex validator).
- Produces:
  - `clipRef` validator: `{ clippingId: string; pageId: string; iiifBase: string; box: {x,y,w,h}; paper: string; date: string; citationMla: string; excerpt: string }`
  - Table `gameDays`: `{ day: number; date1889: string; title: string; clue: clipRef; question: Question; hints: string[] /*max 2*/; reveal: clipRef & { explanation: string }; finaleSeconds?: number /* day 73 only: her total time, parsed from the reveal clipping */; status: "draft" | "published" | "rejected"; rejectReasons: string[] }`, index `by_day`.
  - Table `meanwhile`: `{ date1889: string; scope: string /* lowercase state name or "midwest" */; clip: clipRef; humanStoryScore: number }`, index `by_date_scope`.
  - Queries: `gameDays.listPublished()` → `{ day, date1889, title }[]` (**no clue/answer fields**); `gameDays.getPublished({ day })` → full row or `null` when not published; `meanwhile.forDay({ date1889, state })` → `{ clip, scope, fellBackFrom?: string } | null` (state row, else the `"midwest"` row with `fellBackFrom: state`).
  - Mutations (scripts only): `gameDays.upsert({ row })`, `meanwhile.replaceForDate({ date1889, rows })`.
- [ ] **Step 1: Write failing tests** (convex-test, as in `tests/convex/store.test.ts`):
  - `getPublished returns null for a draft`, and `listPublished omits drafts and rejected days`.
  - `listPublished rows carry no question or clue fields`: assert `Object.keys(row)` equals `["date1889","day","title"]` sorted.
  - `meanwhile falls back to midwest`: with only a `"midwest"` row, `forDay({date1889:"1889-11-29", state:"wisconsin"})` → `scope: "midwest"`, `fellBackFrom: "wisconsin"`.
  - `meanwhile prefers the state row` when both exist.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement; push the schema with `CONVEX_AGENT_MODE=anonymous bunx convex dev --once` (the background `convex dev` also picks it up).
- [ ] **Step 4:** Run full suite. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: Convex game days and meanwhile tables`.

---

### Task 4: Content build: candidates, picks, drafting, Editor, import

**Files:**
- Create: `scripts/game/candidates.ts`, `scripts/game/draft.ts`, `scripts/game/import.ts`, `scripts/game/meanwhile.ts`, `lib/game/draftDay.ts`, `data/game/picks.json`, `data/game/days.json` (generated, committed for review)
- Modify: `lib/pipeline/prompts.ts` (add `CASE_WRITER_PROMPT`, bump `PROMPT_VERSION`)
- Test: `tests/game/draftDay.test.ts`, `tests/game/pickMeanwhile.test.ts`

**Interfaces:**
- Consumes: Convex `clippings`/`pages` (Plan 1), `verifyClaim` (Plan 1 Task 9), `makeComplete` (Plan 1), `askJson`.
- Produces:
  - `candidates.ts` (CLI, no model calls): writes `data/game/candidates.json`: for each 1889–90 date with Bly coverage, the clippings whose cleaned or raw text matches `/\b(Bly|Cochrane?|Bisland)\b/i`, with `{clippingId, pageId, paper, date, excerpt (first 300 chars)}`.
  - `data/game/picks.json`: `Array<{ day: number; clueClippingIds: string[]; revealClippingId: string; note: string }>`. **Hand-curated** by Claude from `candidates.json` and reviewed by Tarik. Pick ~6 days where the coverage poses a real "will she make it?" question (candidates in spec 4.6), and verify every route fact against the clipping text. The finale pick (`day: 73`) must use a clipping that prints her final time; `draft.ts` sets `finaleSeconds` with Task 7's `parseDuration` on that clipping's text and fails the day if it can't.
  - `draftDay(pick, clips, deps: { complete; verify }): Promise<GameDayRow>`: one Case Writer call (schema: `{ title, question, hints: string[2], explanation }`), then Editor checks, each a `verifyClaim` call:
    1. `"clue"`: claim = `"A reader on <date1889> could reason toward an answer to: <question.prompt>"` against the clue clipping(s)
    2. `"clue"`: claim = the correct answer stated as a sentence, against the reveal clipping
    3. `"context"`: claim = `explanation`, against the reveal clipping
    4. `"hint"` per hint: claim = `"This hint does not state or directly give away the answer '<answer text>': <hint>"`, against the hint text

    All pass → `status: "published"`; any fail → `"rejected"` with reasons. **Throws if any clue clipping is dated after `date1889ForDay(pick.day)`** (no hindsight).
  - `pickMeanwhile(clips, date1889): Array<{scope, clip}>`: per Midwest state and `"midwest"`, the highest `humanStoryScore` clipping with `type` in `person|business|event`, `status === "classified"`, `hardHistory !== true`, from a page dated `date1889` (else the nearest earlier date within 3 days).
  - `import.ts`: upserts `data/game/days.json` rows and meanwhile rows into Convex.
  - `CASE_WRITER_PROMPT(dateLabel, clueTexts, revealText)`: instructs: write a "will she make it?" question a reader on that date could reason about from the clue; derive the answer **only** from the reveal; 2 hints phrased as questions that never state the answer; a 2–3 sentence explanation quoting the reveal; and no Carmen Sandiego references.
- [ ] **Step 1: Write failing tests** with fake `complete`/`verify`:
  - `publishes when every Editor check passes`: `status === "published"` and `verify` called 5 times (2 hints).
  - `rejects with reasons when one check fails`: the second `verify` fails → `status === "rejected"`, and `rejectReasons` contains that check's reason.
  - `refuses a clue dated after the day` (no hindsight): pick day 16 with a clue clipping dated `1889-11-30` → throws `/hindsight/`.
  - `pickMeanwhile skips hard history`: the top-scored clipping has `hardHistory: true` → the next one is picked.
  - `pickMeanwhile falls back up to 3 days earlier`, and returns nothing beyond that.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `draftDay`, `pickMeanwhile` and the four scripts.
- [ ] **Step 4:** Run full suite. Expected: PASS.
- [ ] **Step 5: Real content run** (needs Plan 1's processing of the Bly pages to be complete): `bun scripts/game/candidates.ts` → write `data/game/picks.json` → `bun scripts/game/draft.ts` → **show Tarik `data/game/days.json`** (titles, questions, answers, hints, any rejections) → `bun scripts/game/meanwhile.ts` → `bun scripts/game/import.ts`. **Verify:** `bunx convex run gameDays:listPublished` lists ≥ 4 days (the plan's floor), including the finale. Record the Editor rejection count in `docs/LEARNING-LOG.md`.
- [ ] **Step 6:** Commit code + `picks.json` + `days.json`: `feat: game content build with Editor gate`.

---

### Task 5: Design system via /impeccable

**Files:**
- Create: whatever `/impeccable` produces for tokens and base styles (expected `app/globals.css` and/or `app/design/*`), plus `docs/design/play.md` recording the direction
- Reference: `.superpowers/brainstorm/91643-1793209953/content/two-doors.html` (the approved Play/Explore mockup)

**Interfaces:**
- Produces: type scale, color tokens, spacing, and component styling rules that Tasks 6–8 use; a written direction in `docs/design/play.md`.

- [ ] **Step 1:** Invoke the `impeccable` skill. Brief: phone-first daily game; newsprint, not SaaS; real 1889 scans are the hero image; must read well at 375 px; accessible contrast; content notes for hard history must be calm, not alarming. Inputs: the approved mockup above and spec section 4.3.
- [ ] **Step 2:** Follow the skill's process through to tokens and base styles; record the chosen direction and reasons in `docs/design/play.md`.
- [ ] **Step 3: Verify:** `bun run build` passes; the `/` placeholder renders with the new styles at 375 px and 1280 px (screenshot both via ego-browser or Playwright and look at them).
- [ ] **Step 4:** Commit: `feat: Play design system (impeccable)`.

---

### Task 6: Play screens: day list, dispatch, call, hints, reveal

**Files:**
- Create: `app/play/page.tsx`, `app/play/[day]/page.tsx`, `components/ScanCrop.tsx`, `components/DispatchCard.tsx`, `components/CallForm.tsx`, `components/CityEditorHint.tsx`, `components/Reveal.tsx`, `components/RouteStrip.tsx`, `components/Meanwhile.tsx`, `lib/game/usePlayer.ts`
- Test: `tests/game/scanCrop.test.ts`

**Interfaces:**
- Consumes: Task 2 logic, Task 3 queries, Task 5 styles.
- Produces:
  - `iiifCropUrl(iiifBase: string, box: {x,y,w,h}, width: number): string` in `components/ScanCrop.tsx` (exported pure function) → `${iiifBase}/${x},${y},${w},${h}/${min(w,width)},/0/default.jpg`
  - `usePlayer()` hook: `{ progress, today, demo, state, setState, answer(day, choice), useHint(day) }`; `demo` is true when the URL has `?demo=1` or `localStorage["tt.demo"] === "1"`; `state` is the player's chosen state for "meanwhile" (default `"wisconsin"`), kept in `localStorage["tt.state"]`.
  - `/play`: published days with lock state; a "demo mode" switch that sets `tt.demo`.
  - `/play/[day]`: locked screen ("This dispatch arrives <anniversary>") **rendered without fetching `getPublished`** when locked and not demo; otherwise dispatch → call → hints (each costs 1 day, confirm first) → reveal → meanwhile → share button (Web Share API, falling back to copy).
- [ ] **Step 1: Write failing test:** `iiifCropUrl("https://iiif/x", {x:1,y:2,w:551,h:277}, 1600) === "https://iiif/x/1,2,551,277/551,/0/default.jpg"`; with `w: 3000` → `.../1600,/0/default.jpg`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the function, then the screens per Task 5's design (invoke `impeccable` again for each screen's layout pass). `ScanCrop` shows a fallback ("Scan unavailable. Open this page at loc.gov") on `<img onError>`, with the citation link.
- [ ] **Step 4:** Run full suite; `bun run build` exits 0.
- [ ] **Step 5: Verify by hand** on the local app (`bun run dev`, Convex running): play one published day in demo mode at 375 px. The scan crop shows, a wrong answer drops days left by 3, a hint by 1, refreshing keeps the result, and the share text has no port names. Screenshot it.
- [ ] **Step 6:** Commit: `feat: Play screens`.

---

### Task 6b: The Morgue (decision 008, added 2026-10-28)

**Files:** Create `lib/game/pickMorgue.ts`, `components/Morgue.tsx`; Modify `convex/schema.ts` (`gameDayFields.morgue?: clipRef[]`), `lib/game/draftDay.ts` (Pick gains `morgueTerms?: string[]`), `scripts/game/draft.ts`, `app/play/[day]/page.tsx`, `data/game/picks.json`; Test `tests/game/pickMorgue.test.ts`.

- `pickMorgue(clips, { date1889, terms, excludeIds, max = 3 }): Clip[]`: candidates dated **on or before** `date1889`, `status === "classified"`, `hardHistory !== true`, not in `excludeIds`, whose text matches at least one term. Rank by number of distinct terms matched, then the latest date, at most one per page. Tests: excludes later dates (no hindsight); excludes the clue clipping; excludes hard history; ranks by terms, then recency; one per page; max 3.
- The draft script frames each item (`focusBox` on its terms) and keeps an item only if `verifySolvable` says it offers relevant evidence for the day's question. Items that fail are dropped; the day is not rejected.
- UI: a "Check the morgue · N clippings from the files · free" disclosure between the transcript and the call; each item shows paper, date, excerpt and an evidence-framed scan.

---

### Task 7: Finale and "how it works" pages

**Files:**
- Create: `app/play/finale/page.tsx`, `app/how/page.tsx`, `lib/game/finale.ts`
- Test: `tests/game/finale.test.ts`

**Interfaces:**
- Produces:
  - `parseDuration("72 days, 6 hours, 11 minutes, 14 seconds")` → seconds (accepts the day/hour/minute/second words in any order; throws on no match).
  - `finaleResult(guessSeconds: number, actualSeconds: number): { offBySeconds: number; label: string }`. The label is human-readable ("off by 3 hours 12 minutes").
  - `/play/finale`: unlocked on day 73's anniversary or in demo mode. The player enters days/hours/minutes/seconds; the actual time comes from the finale day's reveal clipping (via `parseDuration` on its `explanation`'s quoted figure, stored on the row at draft time), shown with its citation.
  - `/how`: the recorded-run viewer for The Evening World 1889-11-29 p1 (`pageId` from Plan 1's cache). It shows the scan with every clipping box drawn (label + source sam/spark), then three clippings side by side: raw OCR vs cleaned text, with type and human-story score. Header: "Recorded pipeline run, <processed date>".
- [ ] **Step 1: Write failing tests:** `parseDuration("72 days, 6 hours, 11 minutes, 14 seconds") === 72*86400 + 6*3600 + 11*60 + 14`; `parseDuration("nonsense")` throws; `finaleResult(100, 100).offBySeconds === 0`; `finaleResult(0, 11520).label === "off by 3 hours 12 minutes"`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement; design both pages through `impeccable`.
- [ ] **Step 4:** Run full suite; `bun run build` exits 0.
- [ ] **Step 5: Verify:** `/how` shows the contest banner clipping with raw "Nellie IllyM tri" vs cleaned "Nellie Bly's trip" (if the cleaned text differs, record what it actually says; don't edit data to match).
- [ ] **Step 6:** Commit: `feat: finale guess and how-it-works page`.

---

### Task 8: E2E test and CI

**Files:**
- Create: `playwright.config.ts`, `e2e/play.spec.ts`, `.github/workflows/ci.yml`
- Modify: `package.json` (`"e2e": "playwright test"`), `vitest.config.ts` (exclude `e2e/`)

**Interfaces:**
- Consumes: the running app + local Convex with ≥ 1 published day.

- [ ] **Step 1:** `bun add -d @playwright/test` and `bunx playwright install chromium`.
- [ ] **Step 2: Write the E2E test** (device `iPhone 13`):
  - `plays a demo day`: open `/play?demo=1` → open the first published day → pick any option → result shows and "days left" is 80 or 77 → reload → the same result shows and the options are disabled.
  - `locked day hides content`: open `/play/16` without demo on a mocked date before 2026-11-29 → "arrives" text visible; page HTML contains none of that day's option strings.
  - `scan outage falls back` (Review Focus 5): route-abort `tile.loc.gov/**` → the clue text and the "Open this page at loc.gov" link are visible.
- [ ] **Step 3:** `bun run e2e`. Expected: 3 passed. (Fix code, not tests, on failure.)
- [ ] **Step 4: CI workflow** `.github/workflows/ci.yml` on push and PR to `main`: setup Bun → `bun install --frozen-lockfile` → `bunx tsc --noEmit -p .` → `bun run test` → `bun run build` (with `NEXT_PUBLIC_CONVEX_URL` set to a dummy URL). The E2E suite isn't in CI (it needs live data).
- [ ] **Step 5:** Commit: `ci: typecheck, tests, build on every push`.

---

### Task 9: Public deploy (needs Tarik at each marked step)

**Files:** none new (env and dashboard configuration)

- [ ] **Step 1 (Tarik):** Create a **public** GitHub repo (the submission requires a public repo), add the remote, and push `main` and the feature branches. Then **prove CI**: break one test on a branch, watch it go red, and revert. Turn on branch protection requiring the CI check on `main` (manual GitHub setting).
- [ ] **Step 2 (Tarik):** `bunx convex login`, then `bunx convex deploy` to create the cloud deployment. Move the data: `bunx convex export --path cache/convex-local.zip` against the local deployment, then `bunx convex import cache/convex-local.zip --prod`. **Verify:** `bunx convex run gameDays:listPublished --prod` matches local.
- [ ] **Step 3 (Tarik):** `vercel link`; set `NEXT_PUBLIC_CONVEX_URL` (prod) in Vercel; deploy. **Verify:** the deployed `/play?demo=1` plays a day on a real phone, and `/how` renders.
- [ ] **Step 4:** Record the live URL in `README.md` (created here: what it is, how Meta's models are used, built during the hackathon) and commit.

---

## Self-review notes

- **Spec coverage:** 4.1 story → Task 4 prompt + Task 6 copy; 4.2 no hindsight → Task 4 guard + Task 2/3 lock; 4.3 loop → Task 6; 4.4 scoring/finale/rival → Tasks 2, 7 (rival via picks); 4.5 guardrails → Task 4 Editor checks; 4.6 demo mode/~6 days → Tasks 4, 6; 7.2 Editor → Task 4; 7.3 one-time scripts + pre-generated hints → Task 4; 15.2 recorded-run viewer → Task 7; 15.4 IIIF direct → Task 6; 15.5 no live calls → all content pre-generated; 13 impeccable → Tasks 5–7; 9 CI → Task 8; deploy → Task 9.
- **Deferred to Plan 3:** Explore door, follows, the nightly agent's personalized "meanwhile" (Plan 2 ships deterministic per-state picks), sign-in.
- **Dependency:** Task 4 Step 5 needs Plan 1's Bly pages processed. Tasks 1–3 and 5 don't, and can proceed while processing runs.
