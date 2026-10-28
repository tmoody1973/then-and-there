# Then & There — Plan 1: Engine (fetch, segment, clean, classify, verify, store)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a list of Library of Congress newspaper pages into stored, cited, Editor-checkable clippings (box, raw text, cleaned text, type, people, places, human-story score, hard-history flag) that Play, Explore and the agent can read.

**Architecture:** Pure, tested functions in `lib/` (Library client with rate limiting, ALTO parsing, word-to-clipping mapping, garble metrics, model steps, Editor). A Bun worker in `worker/` fetches and caches pages to disk, then runs the pipeline and writes results to Convex. Page images are never stored; browsers load them from the Library's IIIF server. Segmentation approach is decided by Task 1's spike before Task 7 is built.

**Tech Stack:** TypeScript, Bun (runtime + package manager), Vitest, Convex (+ `convex-test`), `openai` SDK pointed at Meta's API, `zod`, `fast-xml-parser`, `an-array-of-english-words`. Next.js gets scaffolded in Plan 2, not here.

**Spec:** `docs/superpowers/specs/2026-10-28-then-and-there-design.md` (sections 7, 8, 11 and 15 are the ones this plan implements).

**Later plans:** Plan 2 (Play), Plan 3 (Explore + light agent) are written after Task 9 lands, against the Convex schema defined in Task 5.

## Global Constraints

- Library JSON API: max **20 requests/min**; exceeding it blocks for **1 hour**. Image, text and storage services: max **150/min**. Bulk downloads: **10 per 10 min**.
- Every search URL includes `searchType=advanced`, `fo=json`, `dl=page`. Without `searchType=advanced`, filters are silently ignored.
- Never call the Library from a user request. Only the worker fetches; everything is cached; one fetch per page.
- OCR comes from ALTO at `https://tile.loc.gov/storage-services/<segment path>.xml`. Never `.txt` (404).
- ALTO→pixel scale is computed per page: `altoPageWidth / imageWidth`. Never hardcoded.
- Only pages dated **before 1931-01-01** enter the pipeline.
- Model API: OpenAI-compatible, base URL `https://api.meta.ai/v1`. Model IDs come from env, never hardcoded in logic.
- Every model output is cached on disk keyed by `sha256(model + promptVersion + clippingId + inputHash)`; unchanged work is never re-run. Budget: **$150 total**.
- Users' follow lists never go to a model. (No user data exists in this plan; the rule binds Plan 3.)
- The Editor **fails closed**: anything it can't parse or reach counts as a fail.
- Every stored clipping keeps its page's Library citation (`cite_this`: APA, Chicago, MLA).

## Review Focus

1. **Library returns an HTML page (CAPTCHA/block) with status 200** → client throws `LocBlockedError` and pauses all Library calls 10 minutes. It must not parse it as JSON or retry in a loop. Test: Task 2.
2. **Truncated JSON** (seen live: a response cut off after 52 s) → retry once, then `LocBadResponseError`; nothing partial is cached. Test: Task 2.
3. **Hyphenated words across lines** ("Poysip-" / "pi") → the joined word "Poysippi" appears once in mapped text, using ALTO's `SUBS_CONTENT`. Test: Task 3.
4. **Model returns malformed JSON or the call errors** → classify retries once then marks the clipping `failed`; the Editor returns `{pass:false, reason:"unparseable"}`. Never a silent pass. Test: Tasks 8 and 9.
5. **A page whose ALTO or `info.json` 404s** → page stored with `status:"failed"` and the error; the worker continues with the next page. Test: Task 4.

---

### Task 0: Repository

**Files:**
- Create: `.gitignore`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`

- [ ] **Step 1:** `git init` in `/Users/tarikmoody/Projects/then-there`. `.gitignore` contains: `node_modules/`, `.env`, `.env.local`, `cache/`, `.superpowers/`, `spikes/*/out/`.
- [ ] **Step 2:** `bun init -y`, then `bun add openai zod fast-xml-parser an-array-of-english-words convex` and `bun add -d vitest typescript @types/bun`. Set `"test": "vitest run"` in `package.json`. `tsconfig.json`: `strict: true`, `module: "esnext"`, `moduleResolution: "bundler"`.
- [ ] **Step 3:** `.env.example`:
  ```
  META_API_KEY=
  META_BASE_URL=https://api.meta.ai/v1
  META_MODEL_SAM=sam-3.1
  META_MODEL_SPARK=muse-spark-1.3
  META_MODEL_BULK=muse-spark-1.3-contributor
  META_MODEL_EDITOR=muse-spark-1.3
  CONVEX_URL=
  ```
  Tarik puts the real key in `.env` (never committed).
- [ ] **Step 4:** Run `bun run test`. Expected: "No test files found" (exit code is fine).
- [ ] **Step 5:** Commit: `git add -A && git commit -m "chore: initialize repo"`

---

### Task 1: Segmentation spike (throwaway; decides Task 7)

Not TDD. Output is a decision, not product code.

**Files:**
- Create: `spikes/sam/README.md`, `spikes/sam/run.ts`, `spikes/sam/overlay.html` (generated), `docs/decisions/007-segmentation-approach.md`

**Interfaces:**
- Produces: the decision in `docs/decisions/007-segmentation-approach.md`: `sam` | `spark` | `hybrid` (SAM for photographs, Spark for article/ad/headline boundaries). Plus the exact SAM and Spark request/response shapes recorded in `spikes/sam/README.md`, which Task 7 implements against.

- [ ] **Step 1: Record the API shapes.** Read `https://dev.meta.ai/docs/sam/overview` and `https://dev.meta.ai/docs/sam/segmenting`, and the Muse Spark image-input docs (`https://dev.meta.ai/docs/image-understanding`). Write into `spikes/sam/README.md`: the endpoint, the request body (how the image is passed: URL or base64), the max image size, and the response fields for boxes, masks and scores. Note anything that differs from the spec's section 8.
- [ ] **Step 2: Pick the 5 pages.** Three are fixed (IIIF bases, verified 2026-10-28):
  - Evening World, 1889-11-29 p1: `https://tile.loc.gov/image-services/iiif/service:ndnp:nn:batch_nn_hanyu_ver01:data:sn83030193:00206539525:1889112902:0708`
  - Homer Guardian, 1889-11-29 p1: `https://tile.loc.gov/image-services/iiif/service:ndnp:lu:batch_lu_iceman_ver01:data:sn88064119:00280761837:1889112901:0223`
  - Wisconsin Weekly Advocate, 1898-12-09 p4: `https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_ifill_ver01:data:sn84025861:00211664770:1898120901:0236`

  Two come from one search each: the first result of `…/collections/chronicling-america/?dl=page&searchType=advanced&fo=json&c=1&fa=partof_title:der+sonntagsbote+(milwaukee,+wis.)+1906-1912&front_pages_only=true` (German), and the first result of `…&location_state=wisconsin&location_city=kenosha&start_date=1889-11-14&end_date=1890-01-25&front_pages_only=true` (dense small-town page). Take each IIIF base from the result's `image_url`.
- [ ] **Step 3: Run SAM.** `spikes/sam/run.ts` requests each page at a width within SAM's max (e.g. `/full/2000,/0/default.jpg`) and calls SAM once per prompt: `photograph`, `advertisement`, `headline`, `article`. Save raw responses to `spikes/sam/out/<page>-<prompt>.json`.
- [ ] **Step 4: Run Muse Spark on the same 5 images.** Prompt: return a JSON array of `{label: "article"|"advertisement"|"headline"|"photograph", x, y, w, h}` in pixel coordinates of the image sent. Save to `spikes/sam/out/<page>-spark.json`.
- [ ] **Step 5: Overlay.** Generate `spikes/sam/overlay.html`: each page image with absolutely positioned boxes, colored by label and source (no image library needed). Push a copy to the brainstorm companion's content dir so Tarik can look at it.
- [ ] **Step 6: Score by eye.** For each page, count the ads and headlines visible on the page, then how many each method boxed. Write a table in the decision record. **Rule:** SAM boxes ≥70% of visible ads and headlines across the 5 pages → `sam`. Otherwise, if Spark does → `hybrid`. If neither, Spark article boxes plus ALTO text blocks → `spark`, and note the gap.
- [ ] **Step 7:** Write `docs/decisions/007-segmentation-approach.md` in the decision-log format (Decision / Why this came up / Options / What we chose and why / What we gave up / How we'll know / What actually happened, left blank). Record the cost of the spike's calls.
- [ ] **Step 8:** Commit: `git add spikes/sam/README.md spikes/sam/run.ts docs/decisions/007-segmentation-approach.md && git commit -m "spike: segmentation approach decided"`

---

### Task 2: Library client with rate limiting

**Files:**
- Create: `lib/loc/client.ts`, `lib/loc/errors.ts`
- Test: `tests/loc/client.test.ts`

**Interfaces:**
- Produces:
  - `createLocClient(opts: { fetchImpl?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void>; jsonPerMinute?: number /*20*/; servicesPerMinute?: number /*150*/ }): LocClient`
  - `LocClient.searchPages(p: { qs?: string; ops?: "AND"|"PHRASE"|"OR"; startDate?: string; endDate?: string; state?: string; city?: string; frontPagesOnly?: boolean; facets?: string[]; count?: number; page?: number }): Promise<LocSearchResult>`
  - `LocClient.getPageJson(resourceUrl: string): Promise<unknown>` (JSON API bucket)
  - `LocClient.getText(url: string): Promise<string>` (services bucket; for ALTO)
  - `LocClient.getJson(url: string): Promise<unknown>` (services bucket; for `info.json`)
  - `type LocSearchResult = { total: number; results: Array<Record<string, unknown>> }`
  - Errors: `LocRateLimitError`, `LocBlockedError`, `LocBadResponseError`, `LocNotFoundError`

- [ ] **Step 1: Write failing tests** in `tests/loc/client.test.ts`, with a fake `fetchImpl`, `now` and `sleep`:
  - `searchPages builds advanced URL`: calling `searchPages({qs:"nellie bly", ops:"PHRASE", startDate:"1889-11-14", endDate:"1890-01-31"})` requests a URL whose params include `searchType=advanced`, `fo=json`, `dl=page`, `qs=nellie bly`, `ops=PHRASE`, `start_date=1889-11-14`, `end_date=1890-01-31`.
  - `json bucket waits after 20 calls`: 21 `getPageJson` calls at the same fake time → `fetchImpl` called 20 times; `sleep` called with a value ≥ the time until the 60 s window frees.
  - `services bucket allows 150/min`: 150 `getText` calls at the same fake time → no sleep.
  - `429 backs off then retries`: first response 429, second 200 → resolves; `sleep` was called with ≥ 60000. Three consecutive 429s → throws `LocRateLimitError`.
  - `html body is a block` (Review Focus 1): 200 with `content-type: text/html` on a JSON call → throws `LocBlockedError`; the next call on any bucket first sleeps ≥ 600000.
  - `truncated json retries once` (Review Focus 2): first body `{"results":[{"a":` then a valid body → resolves; two truncated bodies → `LocBadResponseError`.
  - `404 is not retried`: 404 → `LocNotFoundError`, `fetchImpl` called once.
- [ ] **Step 2:** `bun run test tests/loc/client.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement in `lib/loc/client.ts`. Use a sliding 60 s window per bucket.
- [ ] **Step 4:** `bun run test tests/loc/client.test.ts`. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -am "feat: rate-limited Library of Congress client"` (add new files first).

---

### Task 3: ALTO parsing, paths and scale

**Files:**
- Create: `lib/alto/parse.ts`, `lib/loc/paths.ts`
- Test: `tests/alto/parse.test.ts`, `tests/loc/paths.test.ts`
- Fixture: `tests/fixtures/alto-advocate-1898-12-09-p6.xml` (download the full file, ~1.3 MB, from `https://tile.loc.gov/storage-services/service/ndnp/dlc/batch_dlc_ifill_ver01/data/sn84025861/00211664770/1898120901/0238.xml`)

**Interfaces:**
- Produces:
  - `type AltoWord = { text: string; subs?: string; x: number; y: number; w: number; h: number; wc: number }`, with coordinates in ALTO units
  - `type AltoLine = { x: number; y: number; w: number; h: number; words: AltoWord[] }`
  - `type AltoPage = { width: number; height: number; lines: AltoLine[] }`
  - `parseAlto(xml: string): AltoPage`
  - `altoScale(altoWidth: number, imageWidth: number): number` (ALTO units per pixel)
  - `pathsFromImageUrls(imageUrls: string[]): { altoUrl: string; iiifBase: string }`

- [ ] **Step 1: Write failing tests.**
  - `parseAlto reads page size`: fixture → `width === 17424`.
  - `parseAlto keeps hyphen subs` (Review Focus 3): the line whose words include `"Swadley"` is followed by a line where a word has `subs === "Poysippi"`; some word on the earlier line has `text === "Poysip"` (or `"Poysip-"`) and `subs === "Poysippi"`.
  - `parseAlto reads word confidence`: every word has `0 <= wc <= 1`.
  - `altoScale`: `altoScale(17424, 5808) === 3`; `altoScale(15152, 3788) === 4`.
  - `pathsFromImageUrls` with `["…/full/pct:3.125/0/default.jpg#h=292&w=186", "https://tile.loc.gov/text-services/word-coordinates-service?segment=/service/ndnp/lu/batch_lu_iceman_ver01/data/sn88064119/00280761837/1889112901/0223.xml&format=alto_xml"]` → `altoUrl === "https://tile.loc.gov/storage-services/service/ndnp/lu/batch_lu_iceman_ver01/data/sn88064119/00280761837/1889112901/0223.xml"` and `iiifBase === "https://tile.loc.gov/image-services/iiif/service:ndnp:lu:batch_lu_iceman_ver01:data:sn88064119:00280761837:1889112901:0223"`.
  - `pathsFromImageUrls throws` when no `word-coordinates-service` URL is present.
- [ ] **Step 2:** Run both test files. Expected: FAIL.
- [ ] **Step 3:** Implement with `fast-xml-parser` (attributes on; `String` elements → words; `SUBS_CONTENT` → `subs`; `WC` → `wc`).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: ALTO parsing, Library paths, coordinate scale`.

---

### Task 4: Fetch worker (disk cache)

**Files:**
- Create: `worker/fetch.ts`, `data/manifest/demo-pages.json`
- Test: `tests/worker/fetch.test.ts`

**Interfaces:**
- Consumes: `LocClient`, `pathsFromImageUrls`.
- Produces:
  - `type CachedPage = { pageId: string; lccn: string; title: string; city: string; state: string; date: string; sequence: number; language: string[]; iiifBase: string; altoUrl: string; imageWidth: number; imageHeight: number; citeThis: { apa: string; chicago: string; mla: string }; status: "fetched" | "failed"; error?: string }`
  - `fetchPage(client: LocClient, searchResult: Record<string, unknown>, cacheDir: string): Promise<CachedPage>`. It writes `cacheDir/<safeId>/page.json`, `alto.xml` and `meta.json`, and returns the cached copy without network calls if `meta.json` exists with `status:"fetched"`.
  - `fetchManifest(client, manifestPath, cacheDir): Promise<CachedPage[]>`. The manifest is a JSON array of search specs (`searchPages` params plus `limit`), so the demo corpus is declared, not hand-listed.
  - CLI: `bun worker/fetch.ts data/manifest/demo-pages.json`

- [ ] **Step 1: Write failing tests** with a fake `LocClient` and a temp dir:
  - `writes cache files and meta`: after `fetchPage`, the three files exist; `meta.json` has `citeThis.mla` copied from the page JSON's `cite_this.mla`, and `imageWidth` from `info.json`.
  - `second call makes no network calls`: call twice; fake client methods called once each.
  - `skips pages from 1931 or later`: a result with `date: "1931-01-02"` → `status: "failed"`, `error: "post-1930"`, and no fetches.
  - `404 alto marks failed and continues` (Review Focus 5): `getText` throws `LocNotFoundError` → `status:"failed"`, error message stored; `fetchManifest` still returns the other pages.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Write `data/manifest/demo-pages.json` with these specs:
  - Bly: `{qs:"nellie bly", ops:"PHRASE", startDate:"1889-11-14", endDate:"1890-01-31", limit: 150}`
  - Midwest during the trip, front pages, one spec per state (MN, KS, NE, MI, IN, SD, OH, IL, ND, MO, WI, IA), `limit: 15` each
  - Explore anchors, front pages 1880–1930: Milwaukee `limit: 120`, Chicago `limit: 80`, Detroit `limit: 80`

  Then run the CLI. **Verify:** the console reports N fetched / M failed, and `cache/` holds that many page folders. It takes a while: about 20 JSON calls/min.
- [ ] **Step 6:** Commit (code and manifest only; `cache/` is ignored): `feat: cached fetch worker and demo manifest`.

---

### Task 5: Convex schema and store

**Files:**
- Create: `convex/schema.ts`, `convex/pages.ts`, `convex/clippings.ts`, `convex/editorRuns.ts`
- Test: `tests/convex/store.test.ts` (uses `convex-test`; `bun add -d convex-test @edge-runtime/vm`)

**Interfaces:**
- Produces tables:
  - `pages`: the `CachedPage` fields (minus `status: "fetched"`, which becomes `status: "fetched" | "processed" | "failed"`), plus `altoScale: number`. Index `by_pageId`, `by_state_date`.
  - `clippings`: `pageId, box {x,y,w,h} (image pixels), segLabel, segSource ("sam"|"spark"|"alto"), rawText, meanWc, nonDictRate, cleanedText?, translation?, language?, type? ("person"|"event"|"business"|"ad"|"notice"|"other"), people? string[], places? string[], humanStoryScore? number, hardHistory? boolean, status ("raw"|"cleaned"|"classified"|"failed"), editorStatus ("unchecked"|"pass"|"fail"), promptVersion string`. Index `by_pageId`, `by_type_score`, plus a search index on `cleanedText` filtered by `pageId`.
  - `editorRuns`: `subjectKind ("clipping"|"clue"|"hint"|"context"|"find"|"question"), subjectId string, claim string, pass boolean, reason string, model string, createdAt number`. Export `type EditorRun` with exactly these fields from `convex/editorRuns.ts`; Task 9 imports it.
  - Mutations: `pages.upsert(page)` keyed by `pageId`; `clippings.replaceForPage(pageId, clippings[])`; `clippings.patch(id, fields)`; `editorRuns.log(run)`. Queries: `clippings.byPage(pageId)`, `editorRuns.stats()` → `{ total, passed, failed }`.
- [ ] **Step 1: Write failing tests:** `upsert is idempotent` (two upserts, one row); `replaceForPage replaces` (insert 3, then 2 → 2 rows); `stats counts` (log 3 pass, 1 fail → `{total:4, passed:3, failed:1}`).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** `bunx convex dev --once` (Tarik logs in to Convex if asked), then implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: Convex schema for pages, clippings, editor runs`.

---

### Task 6: Words in a box, and garble metrics

**Files:**
- Create: `lib/pipeline/mapWords.ts`, `lib/pipeline/garble.ts`
- Test: `tests/pipeline/mapWords.test.ts`, `tests/pipeline/garble.test.ts`

**Interfaces:**
- Consumes: `AltoPage`, `altoScale`.
- Produces:
  - `wordsInBox(page: AltoPage, box: {x:number;y:number;w:number;h:number}, scale: number): { text: string; meanWc: number; wordCount: number }`. A word is inside if its center, divided by `scale`, falls inside the pixel box. Words are ordered by line, then x. A hyphen pair with the same `subs` emits `subs` once.
  - `nonDictionaryRate(text: string): number` = share of alphabetic tokens (letters only after stripping digits and punctuation, length ≥ 3, lowercased) not in `an-array-of-english-words`, also accepting the token minus a trailing `s`, `ed` or `ing`. Returns 0 for no tokens.
- [ ] **Step 1: Write failing tests.**
  - With the Task 3 fixture and `scale = 3`, `wordsInBox(page, {x:1320, y:6930, w:880, h:560}, 3).text` contains `"Nicholas Swadley of Pine Village"`, contains `"Poysippi"` exactly once, and contains `"Jolliffe"`.
  - `nonDictionaryRate("the quick brown fox") === 0`.
  - `nonDictionaryRate("1bshol 4joidin the")` is `2/3` (±0.001).
  - `nonDictionaryRate("") === 0`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: map ALTO words to clippings; garble metric`.

---

### Task 7: Segmenter (implements Task 1's decision)

**Files:**
- Create: `lib/meta/client.ts`, `lib/meta/cache.ts`, `lib/segment/segmentPage.ts`
- Test: `tests/segment/segmentPage.test.ts`, `tests/meta/cache.test.ts`

**Interfaces:**
- Produces:
  - `metaClient()`: an `OpenAI` instance with `baseURL` from `META_BASE_URL` and `apiKey` from `META_API_KEY`. Throws a clear error if the key is missing.
  - `cachedCall<T>(key: { model: string; promptVersion: string; subjectId: string; input: unknown }, fn: () => Promise<T>, dir = "cache/model"): Promise<T>`. The file name is the sha256 of `JSON.stringify(key)`.
  - `type Box = { x: number; y: number; w: number; h: number; label: "article"|"advertisement"|"headline"|"photograph"; score: number; source: "sam"|"spark"|"alto" }`
  - `segmentPage(page: { pageId: string; iiifBase: string; imageWidth: number; imageHeight: number }, deps: { call: (req: unknown) => Promise<unknown> }): Promise<Box[]>`. It sends a downscaled image (width set by Task 1's max) and **returns boxes in full-resolution pixels**.
- [ ] **Step 1: Write failing tests.**
  - `cachedCall runs fn once`: two calls with the same key → `fn` called once; a changed `promptVersion` → called again.
  - `segmentPage scales boxes to full resolution`: page `imageWidth: 5808`, request width 2000, fake response with a box at `x:100, w:200` → returned `x ≈ 290.4`, `w ≈ 580.8`.
  - `segmentPage drops degenerate boxes`: a response box with `w: 0` is filtered out.
  - The approach-specific test (per the decision): for `sam`, one request per prompt in `["photograph","advertisement","headline","article"]`; for `hybrid`, SAM only for `photograph` plus one Spark request for the rest. Assert on the fake `call`'s received requests, using the exact shapes recorded in `spikes/sam/README.md`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement, wrapping each model request in `cachedCall`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: page segmenter (<decision>) with cached model calls`.

---

### Task 8: Clean and classify

**Files:**
- Create: `lib/pipeline/clean.ts`, `lib/pipeline/classify.ts`, `lib/pipeline/prompts.ts`
- Test: `tests/pipeline/clean.test.ts`, `tests/pipeline/classify.test.ts`

**Interfaces:**
- Consumes: `cachedCall`, `metaClient`.
- Produces:
  - `needsCleanup(m: { meanWc: number; nonDictRate: number }): boolean` → `meanWc < 0.80 || nonDictRate > 0.12`. *(Claude's thresholds, from the spec leaving them to the builder; tune after Task 10's run.)*
  - `cleanClipping(c: { clippingId: string; cropUrl: string; rawText: string; language?: string }, deps): Promise<{ cleanedText: string; language: string; translation?: string }>`. Uses `META_MODEL_BULK` by default and `META_MODEL_SPARK` when `nonDictRate > 0.25`. Sends the crop image URL plus the raw text. A translation is returned only when the language isn't English.
  - `ClassificationSchema` (zod): `{ type: "person"|"event"|"business"|"ad"|"notice"|"other"; people: string[]; places: string[]; humanStoryScore: number /*0..1*/; hardHistory: boolean; hardHistoryReason?: string }`
  - `classifyClipping(c: { clippingId: string; text: string }, deps): Promise<{ ok: true; value: Classification } | { ok: false; error: string }>`
  - `PROMPT_VERSION = "2026-10-28.1"`, exported from `prompts.ts` and included in every cache key.
- [ ] **Step 1: Write failing tests** with a fake model:
  - `needsCleanup({meanWc:0.85, nonDictRate:0.09}) === false`; `({meanWc:0.79, nonDictRate:0.05}) === true`; `({meanWc:0.9, nonDictRate:0.13}) === true`.
  - `cleanClipping picks the strong model for heavy garble`: `nonDictRate: 0.3` → the request's model is `META_MODEL_SPARK`.
  - `classifyClipping parses valid JSON`: the fake returns valid JSON → `ok: true`, `type: "business"`.
  - `classifyClipping retries once on malformed JSON, then fails` (Review Focus 4): the fake returns `"not json"` twice → `ok:false`, and the fake was called exactly twice.
  - `classifyClipping rejects out-of-range score`: `humanStoryScore: 1.4` → treated as malformed.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The classify prompt defines `hardHistory` as: racist or ethnic caricature, slurs, lynching or graphic violence coverage, or demeaning ads.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: clean and classify steps with schema validation`.

---

### Task 9: The Editor

**Files:**
- Create: `lib/editor/verify.ts`
- Test: `tests/editor/verify.test.ts`

**Interfaces:**
- Produces:
  - `verifyClaim(input: { subjectKind: EditorRun["subjectKind"]; subjectId: string; claim: string; sourceText: string; cropUrl: string }, deps: { call; log: (run: EditorRun) => Promise<void> }): Promise<{ pass: boolean; reason: string }>`
  - Uses `META_MODEL_EDITOR`. The prompt contains **only** the claim, the source text and the image. No drafting context, no user data. It asks for `{"pass": boolean, "reason": string}`.
  - Every call logs one `editorRuns` row.
- [ ] **Step 1: Write failing tests:**
  - `passes when model passes`: fake `{"pass":true,"reason":"stated in line 3"}` → `pass:true`; `log` called once with `pass:true`.
  - `fails closed on malformed output` (Review Focus 4): fake `"yes"` → `{pass:false, reason:"unparseable"}`; logged as a fail.
  - `fails closed on network error`: fake throws → `{pass:false, reason:"editor-unavailable"}`.
  - `prompt carries no extra context`: the request body's text contains the claim and the source text, and not the string `"draft"`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: fail-closed Editor`.

---

### Task 10: Process pages end to end

**Files:**
- Create: `worker/process.ts`
- Test: `tests/worker/process.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `processPage(page: CachedPage, deps: { segment; clean; classify; store: { upsertPage; replaceClippings }; altoXml: string }): Promise<{ clippings: number; cleaned: number; failed: number }>`. Steps: segment → `wordsInBox` per box → metrics → clean only if `needsCleanup` → classify everything except `photograph` → store.
  - Crop URL for a box: `${iiifBase}/${x},${y},${w},${h}/full/0/default.jpg` (full-res pixel ints).
  - CLI: `bun worker/process.ts [--limit N]` processes cached pages with `status:"fetched"` and prints the totals and estimated spend (sum of `usage` tokens × env prices).
- [ ] **Step 1: Write failing tests** with fakes:
  - `stores one clipping per box with raw text`: 2 boxes → `replaceClippings` receives 2 rows, each with `rawText` and `meanWc`.
  - `skips cleanup when text is good`: metrics under the thresholds → `clean` not called; `status: "raw"` → after classify, `"classified"`.
  - `photographs are not classified for text`: a `photograph` box → `classify` not called.
  - `one failing clipping doesn't fail the page`: `classify` returns `ok:false` for one of 3 → page `status:"processed"`, that clipping `status:"failed"`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Real run, small.** `bun worker/process.ts --limit 5` on the five spike pages.

  **Verify:** the Convex dashboard shows clippings for 5 pages. The Evening World 1889-11-29 contest paragraph has `cleanedText` containing `"Nellie Bly's"`. The Ellmore clipping (Advocate 1898-12-09 p4) is `type: "person"` or `"business"` with `humanStoryScore ≥ 0.6`. The printed spend is under $2. If not, stop and tune before the full run.
- [ ] **Step 6: Full run.** `bun worker/process.ts`. **Verify:** totals printed; spend under $40 (leaves budget for Play/Explore/agent and the Editor). Record pages processed, clippings, cost per page and failures in `docs/LEARNING-LOG.md` as a dated entry.
- [ ] **Step 7:** Commit: `feat: end-to-end page processing`.

---

## Self-review notes

- **Spec coverage (engine scope):** 7.1 steps 1–6 → Tasks 2–4, 6–8, 10. 7.2 Editor → Task 9 (wired into Play/Explore/agent flows in Plans 2–3). 8 models and budget → Tasks 7, 8, 10. 11 data facts → Global Constraints and Tasks 2–4. 15.4 (IIIF direct) → no image storage anywhere. 15.5 (no model calls on the judging path) → everything here is offline/precomputed. The Wed "segmentation spike" and "fetch worker" rows of spec section 9 → Tasks 1 and 4.
- **Deferred on purpose:** CI workflow and the Hetzner deploy move to Plan 2/3, since the first public deploy and the nightly job happen there. The measurement scripts (spec section 10) go to the Tue plan, using `editorRuns.stats()` and the Task 10 log.
