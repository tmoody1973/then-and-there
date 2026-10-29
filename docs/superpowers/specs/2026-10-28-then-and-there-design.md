# Then & There — Design

**Date:** 2026-10-28 · **Builder:** Tarik Moody (solo) · **Event:** Meta Global AI Developer Hackathon, indie track
**Deadline:** Wed Nov 4, 2026, 9:00 PM ET (8:00 PM Central). Tarik is accepted.
**Superseded in part (Oct 29):** decision 010 restores the full scope from Tarik's mockup; the non-goals in section 2 for the front-page game, One Day, Spot the Forgery and Quests no longer hold.
**Supersedes:** the feature list in `docs/then-and-there.md`. That file stays as background; where they disagree, this file wins.

---

## 1. Intent

America's historic newspapers are online and free: 23,852,853 pages in the Library of Congress's Chronicling America collection. They are mostly **readable but unread**. The OCR (the computer-generated text behind each scan) is usually good enough to search, but a search box only helps if you already know the name to type. Nobody knows to search for J. E. Ellmore, the Black barber in 1898 Appleton whose Milwaukee newspaper called him "the smartest gentleman of our race, and we are proud of him." His story has been online for years. Nobody has read it.

Then & There uses Meta's models to do an editor's job at scale: cut each page into its separate stories, read and repair them, decide which ones have a person in them, check every claim against the scan, and put those stories in front of people through two doors.

- **Play:** *Race Nellie Bly around the world, in real time, 137 years later.* A daily game built from real 1889 newspapers.
- **Explore:** a Story Finder for students, teachers and history buffs. Search, open the scan, cite.

A **light personal agent** remembers what each person cares about and works between visits.

**Why this matters to Tarik (theme: "Build for Your World").** He works in public media at Radio Milwaukee, has hosted a show about the stories behind music for 20+ years, and sits on Milwaukee's City Plan Commission. Finding the human story in old material is his job. This tool does it across millions of pages.

**Background finding that shaped this design** (see `docs/LEARNING-LOG.md`, 2026-10-28): we expected broken OCR to be the main barrier. Testing one 8-page issue of *The Wisconsin Weekly Advocate* (Dec 9, 1898) showed the OCR was mostly fine (9–13% non-dictionary words, many of them names). The real barrier is discovery. OCR repair stays in, as a supporting step for the worst pages. One 1889 Louisiana page ran 24% non-dictionary words, and The Evening World's front page of Nov 29, 1889 rendered "Nellie Bly's trip" as "Nellie IllyM tri".

## 2. Goals, non-goals, anti-goals

**Goals (what success looks like on Nov 4)**
1. A judge can play a Bly dispatch day end to end on the live site, on a phone.
2. A judge can search the Story Finder and get a verified clipping with its scan and a citation.
3. The demo shows a raw 1889 page going in and a verified, playable clue card coming out, with the Meta models visibly doing each step.
4. The light agent has run unattended and delivered at least one real, Editor-verified note, with an activity log that matches what happened.
5. The submission reports measured numbers (section 10).

**Judging weights (from the Official Rules)**, which drive every priority call: Impact 30%, Use of Meta AI Tooling 25%, Demo 25%, Technical Depth & Execution 20%.

**Non-goals this week (roadmap only, described in the submission, not built)**
- The daily front-page "guess where and when" game from the earlier plan
- One Day, Many Papers (side-by-side comparisons)
- A knowledge graph of people, places and events
- Integration with Backfield (Local Angle's open-source newsroom data platform). A strong post-hackathon partner, not a dependency now
- Spot the Forgery, Quests, Classroom mode with class codes, daily audio segments
- All 72 Bly days. Build enough for launch and demo (section 4.6)

**Anti-goals (failure even if it technically works)**
- **Any uncited or unverified claim reaching a user.** The Editor gate is the product's integrity.
- **A staged agent "find" presented as live.** If the demo replays a past batch, the screen says so.
- **Anything that reads as a Carmen Sandiego recreation.** The chase genre is fine. Never use its names, characters, organizations, look or structure. The guide character is "the City Editor," never "the Chief."
- **Hiding or decorating hard history.** Old pages contain racist ads, slurs and graphic crime coverage. Show them in historical context; don't sanitize them and don't make them gamified spectacle.
- **Hammering the Library's servers.** One fetch per page, cached for everyone.
- **A demo that only works on video.** Demo is 25% of the score, and the rules say the product should "hold up live."

## 3. Who it's for

| Who | Door | What they get |
|---|---|---|
| Daily-puzzle players | Play | A two-minute daily ritual with a story that continues tomorrow; streak; share card |
| Teachers and students | Explore (+ Play as a Nov–Jan unit) | Verified primary sources with scans and citations; reading conflicting reports; geography |
| History buffs and family researchers | Explore + agent | Stories from places and names they follow, found in cleaned text a keyword search would miss |
| Radio producers and newsrooms | Play + Explore | "Where's Nellie today?" as a 60-second daily segment, with sources |

**Prior art and how we differ:** TimeGuessr (daily where/when game with historic photos), Redactle (progressive reveal), GenealogyBank (paid surname email alerts on raw OCR, since 2019). We differ on source (free public newspapers), method (models cut pages into stories and repair the text, so we match names raw OCR misses), and verification (every clue and claim checked against the scan).

## 4. Door 1: Play — "Race Nellie Bly"

### 4.1 The story
Nov 14, 1889: *New York World* reporter Nellie Bly sails from Hoboken to beat the fictional 80-day record from *Around the World in Eighty Days*. She returns Jan 25, 1890, after about 72 days. The country followed her in the papers, and the *World* ran a contest for readers to guess her exact time. **Verified:** The Evening World, Nov 29, 1889, p. 1: "A FREE TRIP TO EUROPE for the NEAREST GUESS as to the Exact Time of NELLIE BLY'S TOUR."

The player is a cub reporter on a city desk. Their **City Editor** bets they can work out where Bly is headed before the wire reports it.

**Facts to verify against the pages before they appear in the game** (from general knowledge, not yet checked): her route (Southampton → Amiens, where she met Jules Verne → Brindisi → Port Said → Aden → Colombo → Penang → Singapore → Hong Kong → Yokohama → San Francisco → Jersey City); the rival Elizabeth Bisland of *Cosmopolitan*, sent west the same day, whom Bly learned about in Hong Kong; her final time. Every fact the game asserts must come from a cited clipping (anti-goal 1).

### 4.2 Core rule: no hindsight
Each game day maps to one calendar date in 1889–90. Players see only what papers printed **on or before** that date. Today's clue comes from what was known *before* the move; the reveal comes from the coverage that confirmed it. This stops the clue from simply announcing where she is, and it's what 1889 readers actually experienced.

### 4.3 The daily loop (2–3 minutes)
1. **Dispatch:** one clue card, a clipping from a real page, shown highlighted on the scan, with clean text and the citation.
2. **The call: "Will she make it?"** (Tarik's call, 2026-10-28). Her planned route was public, so the drama for 1889 readers was **timing and obstacles**, not destination. Each day asks a question readers actually faced, drawn from that day's coverage. Will she catch the connecting steamer? How many days to the next port? Does a delay sink the schedule? Will the rival beat her? Answers are multiple choice or a number of days. A "where next?" route guess is used **only** where her plans actually changed or were uncertain in print.
2b. **Check the morgue (free; decision 008):** a drawer of 2–3 real clippings printed on or before that day (no hindsight) about the next place, her connections, or her published plans, each Editor-checked as relevant. Like an almanac in a detective game, it makes looking things up part of the call. Flagged hard-history clippings are excluded in v1.
3. **Ask the City Editor (optional):** a question-only hint ("Which steamer lines ran east from Brindisi that week?"). It never gives the answer. Each hint costs days.
4. **Reveal:** the clipping that confirmed it, plus a short "how you could have known," cited.
5. **Meanwhile, back home:** one human-interest story printed the same day in the player's followed place (section 6.2).
6. **Notebook:** the clipping is saved, her route is drawn, and a spoiler-free share card is offered: "Day 12 · beat Nellie to Port Said 🚢 · 2 hints".

**Transit days:** many days she's at sea. Those days still get a dispatch, built from whatever coverage exists that day (speculation, ship schedules, the contest), with a smaller question (e.g., arrival estimate). Days with no coverage at all: 9 of 73. They reuse the nearest prior day's coverage, labeled as such.

### 4.4 Scoring and pacing
- The player starts with a **day budget**. Wrong calls and hints spend days. Exact numbers are left to the builder; tune so a careful player finishes under Bly's ~72 days and a careless one doesn't.
- **Live mode:** a day unlocks on its anniversary date (2026 = 1889 + 137 years). Missed days can be played late; the streak counts only days played on the day.
- **Finale (Jan 24/25):** every player submits a guess of her exact time in days, hours, minutes and seconds, the *World*'s actual contest. Then they see how they compare with the real result. The game must not assert any 1889 reader statistics unless a cited clipping supports them.
- **Rival chapter:** from the Hong Kong stop on, dispatches can also track Bisland, if the coverage supports it.

### 4.5 Guardrails specific to Play
- Every clue must pass the Editor's **solvability check**: answerable from the clipping plus what earlier dispatches showed.
- Hints are checked so they never state the answer.
- Share cards contain no spoilers.

### 4.6 Content scope for Nov 4
- Launch target: Nov 14, 2026, real-time Day 1.
- **For the hackathon, build ~6 "dramatic stop" days, fully playable**, chosen where the coverage has a real "will she make it?" question. Candidates (pick from what the pages support; route facts unverified): the Verne meeting at Amiens; the contest launch (Nov 29, 1889, Evening World front page, verified); the Colombo delay; the Hong Kong rival reveal; the Pacific crossing / San Francisco special train; the finale contest guess. *Why not Days 1–7:* the reviewer found Nov 14–20 are all Atlantic sea days with no strong call. Days 1–7 get built with the same pipeline **after Nov 4 and before the Nov 14 launch**.
- The judging window is before Nov 14, so the site needs a **demo mode** that lets anyone play the built days without waiting for the anniversary.
- The pipeline that built those days must be able to build the rest. Showing that it can is part of the Technical Depth story.

## 5. Door 2: Explore — Story Finder (kept thin)

**In:**
- Search by keyword, place (state/city) and date range
- Filters: language/community of the paper (e.g., Black press, German, Polish, where the Library's metadata or a curated title list supports it), front pages, "people only," Editor-verified only
- Result card: highlighted clipping, cleaned text, paper, date, page, type (person / event / business / ad)
- **Open scan** (the original page, one tap away)
- **Cite**: use the Library's own citations (APA, Chicago, MLA come in each page's JSON as `cite_this`) plus the page/clipping location
- **Follow** a place or name (feeds the agent, section 6)
- **Teacher pack:** pick a theme or date → a printable set of up to ~8 verified clippings with scans, citations and 3 discussion questions (questions written by Muse Spark, Editor-checked)

**Hard history** (Tarik's call, 2026-10-28): racist ads, slurs and graphic crime coverage are **shown, with a content note**. The pipeline flags such clippings (a classification label). Flagged cards carry a short note and Editor-checked historical context. Teacher packs **exclude** flagged clippings unless the teacher opts in. Nothing is hidden by default in Explore and nothing is decorated.

**Out:** accounts beyond what Follow needs; collections, sharing and classes; a knowledge graph; full-text search across all 23.8M pages. Explore searches **what our pipeline has processed**, and it says so on screen ("Searching N processed pages").

**Home region: the Midwest** (Tarik's call, 2026-10-28). The product works for any place, but the processed corpus and the demo focus on the Midwest, with three anchor cities whose immigrant and Black press the archive holds:

| City | Front pages 1880–1930 (verified) | Community press examples |
|---|---|---|
| Milwaukee | 11,082 | *Wisconsin Weekly Advocate* (Black, 1898–), *Wisconsin Enterprise-Blade* (Black, 1925–), *Milwaukee Leader* (socialist daily, 1911–1938), *Vorwärts* / *Der Sonntagsbote* (German), *Zgoda* (Polish, 1881–1901) |
| Chicago | 34,275 | *Týdenní hlasatel* (Czech), *Zgoda* (Polish), *Draugas* (Lithuanian), *Dziennik Chicagoski* (Polish, 67,288 pages overall), *The Day Book* (1911–1917) |
| Detroit | 7,522 | *Detroit Times* (1903–1920), *Detroiter Abend-Post* (German), Detroit *Plaindealer* (Black, 1883–1895) |

Black-press titles for Chicago (e.g., *The Broad Ax*) are **unverified** in this sample. Check before naming them in the pitch.

**Corpus for Nov 4** (what the pipeline processes): all Bly pages needed for the built game days; the Midwest pages for those days (for "meanwhile, back home"); and a curated Explore set from the three anchor cities, a few hundred pages per city, chosen to cover each community's press. Milwaukee is the deepest set and the demo's showcase. The builder picks exact page counts within the credit budget (section 8.4).

## 6. The light personal agent (Option A)

### 6.1 What it remembers (visible, editable, deletable)
- Follows: places and names
- What the user has already seen (never repeat a story)
- Bly game progress
- Saved clippings

### 6.2 What it does every night
1. **Prepares tomorrow's "meanwhile, back home."** For tomorrow's 1889 date, it picks the strongest unseen human-interest clipping from the user's followed place. **Fallback order: city → state → Midwest → national.** The card says which level it used ("No Milwaukee papers survive in the archive for Nov 30, 1889. Here's Kenosha."). **Verified constraint:** big-city coverage in 1889 is thin. For Nov 14, 1889 – Jan 25, 1890 the archive has 0 Milwaukee pages, Chicago only via a humor weekly, and Detroit 11 pages in a 100-page sample. The Midwest as a whole has **11,499 pages** in that window: MN 1,848 (St. Paul), KS 1,546 (Wichita), NE 1,492 (Omaha), MI 1,103 (Grand Rapids, Detroit), IN 936 (Indianapolis), SD 879, OH 816, IL 767, ND 644, MO 588, WI 580, IA 300. So the state and Midwest levels will carry most 1889 "meanwhile" picks. Precompute per place, not per user, so cost doesn't grow with users.
2. **Checks the Library's newly added batches.** It downloads `https://chroniclingamerica.loc.gov/data/ocr/ocr.json` (one entry per batch, with an ingest date and page count; updated as recently as 2026-10-27) and compares it with the previous copy. For each new batch, including re-OCR'd `_ver02`/`_ver03` batches, it downloads the batch's OCR bundle (one bulk request each), cleans the relevant hits, and matches every user's follows locally. **Never** one API search per user per name.
3. **Editor sign-off** on every candidate.
4. **At most one notification per user per night,** only for a verified find. Delivery channel (email or in-app) is the builder's choice; in-app is enough for the demo.
5. **Activity log** per user, written as it works: "Checked 2 new batches (7,907 pages). Searched 3 follows. 1 candidate. Editor confirmed. Sent 1 note."

### 6.3 The demo find, done honestly
New pages arrive at about 20,000 a month nationwide (2026 pace), so a live find for a chosen follow during demo week is unlikely. The demo **replays recent real batches** (e.g., one ingested 2026-10-15, 7,907 pages) against a real follow list, and the screen labels it as a replay.

### 6.4 Gate to Option B (talk-to agent)
B is a chat interface over A's tools (search processed clippings, follow, cite, explain). Start B **only if** both:
- **A is proven:** the nightly job ran two consecutive nights untouched, the activity log matched reality, and one real verified note was delivered.
- **It's no later than Mon Nov 2.**

Otherwise B goes in the roadmap. Play and Explore are never cut to make room for B.

## 7. The engine

Deterministic code first, models where judgment is needed, and the Editor before anything reaches a user. Every stored claim points to a stored clipping.

### 7.1 Pipeline
1. **Fetch** (background worker, never on behalf of a live user): page metadata via the loc.gov JSON API; ALTO XML (the OCR file format that stores every word's text, position and confidence) and page images via tile.loc.gov. Cache everything.
2. **Segment:** cut the page into clippings (articles, ads, headlines, photos). Approach decided by today's spike (section 9, Wed).
3. **Map words to clippings:** attach the ALTO words that fall inside each clipping's box. That gives raw text and per-word confidence per clipping, with no extra OCR.
4. **Clean:** clippings whose confidence or dictionary rate falls below a threshold go to Muse Spark with the image crop for correction. Translate non-English text. Bulk cleanup can use a cheaper model (section 8).
5. **Classify and score:** type (person / event / business / ad / notice), the people and places named, and a "human story" score used to pick "meanwhile" stories and Explore results.
6. **Store:** each clipping with its box, type, raw text, cleaned text, translation, confidence, citation, and Editor status.

### 7.2 The Editor
A separate model call that never sees the drafting reasoning. It gets: the claim or clue, and the clipping's image and text. It returns pass/fail and a reason. It runs on game clues (solvability), hints (no answer leak), "how you could have known" text, "meanwhile" picks, agent finds, teacher-pack questions and Explore summaries. Every decision is logged for the submission's rejection-rate number.

### 7.3 Agents in the system (what is live vs one-time)
- **Live:** the personal agent (nightly), the City Editor (hints at play time; these can be pre-generated per day and served from cache), the Editor.
- **One-time scripts, run by Tarik and reviewed:** building the Bly days ("Case Writer") and the research that finds clue clippings ("Researcher"). They can be described as agents in the README; they don't need to run as services.

## 8. Meta models

| Model | Job | Verified facts |
|---|---|---|
| **SAM 3.1** (`sam-3.1`) | Cut pages into clippings | Text prompt → boxes + masks; one noun phrase per request; concrete nouns work best; $2.50 per 1,000 images; 3,000 requests/min. **Unverified: whether "advertisement," "headline," "article" work on newspaper scans** |
| **Muse Spark** (`muse-spark-1.x`) | OCR repair with the image, translation, classification, hint writing, "how you could have known," Editor | Accepts text and images (up to 50 per request) |
| **Muse Wonder** (`muse-wonder-1.0`) | Candidate for the Editor if it verifies better | Image input unverified; test before choosing |
| **Muse Image** (`muse-image-1.0`) | Not in scope this week (roadmap: labeled photo restoration, forgery round) | Generates and edits images |
| **Open-weights Muse Spark Open**, or `muse-spark-1.3-contributor` at $0.10/$0.20 per million tokens | Bulk cleanup at low cost | The contributor tier is cheap **because Meta trains on what's sent**. Fine for public-domain pages; note it in the README |

- API: OpenAI-compatible, base URL `https://api.meta.ai/v1`.
- **Credits:** $150 in Meta Model API credits, valid for a 10-day window. **Tarik's billing page (2026-10-28) shows $150.00 free credits in use, $0.00 balance, and a Muse Code subscription.** The page shows no expiry date; the 10-day window comes from the hackathon rules, so check the exact end date in the dashboard. **Privacy:** the billing page says "While using free credits your content may be used for product improvement." Public-domain page text is fine to send. **Users' follow lists (family surnames, places) must not be sent to the model.** Match follows against cleaned text locally, and send the Editor only the clipping and the matched span, never the user's list or identity. Budget processing to fit (section 10 reports cost per page), and finish pre-generating everything judges can touch before they expire (section 15, item 5).
- Muse Code is the coding agent, not a model the app calls. If Tarik uses it to build, the README should say so.

### 8.4 Budget guidance
Cache every model output by clipping and prompt version; never re-run unchanged work. Bulk work goes to the cheapest adequate tier. The builder sizes the corpus to stay inside $150 with a reserve for demo-day reruns.

## 9. Build schedule (Oct 28 – Nov 4)

| Day | Goal | Done when |
|---|---|---|
| **Wed Oct 28** | Segmentation spike + fetch worker | SAM run on 5 pages (the Nov 29, 1889 Evening World front page; one more 1889 Bly page; one Advocate page; one German Milwaukee page; one dense small-town page) with "photograph," "advertisement," "headline," "article." Decision recorded: SAM for everything / SAM for visuals + Muse Spark vision for article boundaries / other. Worker fetches and caches pages within rate limits |
| **Thu Oct 29** | Pipeline end to end | Fetch → segment → map words → clean → classify → store → Editor works on the demo pages; demo corpus queued |
| **Fri Oct 30** | Play | ~6 dramatic-stop days playable in demo mode, with the City Editor and the Editor checks |
| **Sat Oct 31** | Explore + agent (A) | Story Finder search, scan, cite; follows; nightly job deployed and running |
| **Sun Nov 1** | Agent proven? + polish Play | Night 2 of the agent; activity log checked; share card; mobile layout |
| **Mon Nov 2** | **Gate:** B or polish | If A is proven → start B; otherwise teacher pack + polish |
| **Tue Nov 3** | Measure | Numbers in section 10; bug fixes; rehearse the demo live |
| **Wed Nov 4** | Ship | Demo video, README, submit by mid-afternoon Central |

**Cut order if behind:** B → teacher pack → Explore filters beyond place/date → reduce the dramatic-stop days from ~6 to 4. Never cut: the Editor gate, at least 4 playable days, basic Explore search with scan and cite, the agent's nightly "meanwhile" job.

**CI:** add a CI workflow (typecheck, tests, build on every push) before the first public deploy, per Tarik's standing rule. Branch protection on `main` is a manual step for Tarik.

## 10. What we measure and report
- **OCR repair:** character error rate, raw vs cleaned, on 10–20 hand-transcribed clippings (include the Evening World contest paragraph).
- **Editor rejection rate:** share of drafted clues, hints and claims rejected, with one real example.
- **Solvability:** every shipped clue passed the Editor's check.
- **Cost per page:** total model spend ÷ pages processed.
- **Discovery:** count of "human story" clippings surfaced from the processed corpus, broken out by paper community, without claiming more than the sample supports.

## 11. Data source: facts the builder must know
Verified live on 2026-10-28.

- **Search API:** `https://www.loc.gov/collections/chronicling-america/?…&fo=json`. **Keyword and date filters (`qs`, `ops`, `start_date`, `end_date`) are silently ignored unless `searchType=advanced` is included.** Without it you get all 23.8M pages back. `dl=page`, `location_state`, `location_city`, `front_pages_only=true`, `fa=language:german`, `fa=partof_title:…` all work.
- **Rate limits:** JSON API **20 requests/min; exceeding it blocks you for 1 hour**. Image, text and storage services 150/min (1-hour block). Bulk downloads 10 per 10 minutes. You may get 429s or CAPTCHAs even below the limits. Response times ranged from 3.7 to 52 seconds, and one response came back cut off. Use retry with backoff, and never call the API from a user request.
- **Legacy site is gone** (retired Aug 4, 2025). `batches.json` and the old search URLs return 404. Don't use the old Chronicling America API docs.
- **OCR text:** not in search results. Use the ALTO XML at `https://tile.loc.gov/storage-services/<segment path>.xml`, where the segment path comes from the `word-coordinates-service` URL in each result's `image_url` list. ALTO has every word with position and confidence (`WC`), lines and coarse blocks. **ALTO blocks are columns, not articles**, so they don't replace segmentation. Plain `.txt` returns 404.
- **Coordinate scale differs per page:** divide by `ALTO Page WIDTH ÷ image width` (3 on one page, 4 on another). Compute it per page; never hardcode it.
- **Images:** IIIF Image API level 2 at `https://tile.loc.gov/image-services/iiif/service:ndnp:…/info.json`; arbitrary pixel crops and sizes (e.g., 5808×8087 full page). `/{x},{y},{w},{h}/full/0/default.jpg` crops a clipping.
- **Citations:** each page's JSON (`/resource/…/?sp=N&fo=json`) has `cite_this` with APA, Chicago and MLA.
- **New batches:** `https://chroniclingamerica.loc.gov/data/ocr/ocr.json` (batch name, `ingested`, `lccns`, `page_count`, `url`); per-batch OCR bundles `.tar.bz2` in `/data/ocr/`. Query a batch's pages with `fa=batch:<name>`.
- **Newspaper Navigator** (the Library's 2020 dataset of photo/ad/headline boxes) is retired. A CC0 copy exists on Hugging Face (`biglam/newspaper-navigator`, 3.27M boxes, pages processed through 2020). A possible segmentation fallback for visual elements only; the box format is unverified.
- **Coverage we confirmed:** "nellie bly" phrase: 410+ pages, Nov 14, 1889 – Jan 31, 1890; 64 of the 73 trip days have ≥1 page. Includes The Evening World (NY), the Detroit *Plaindealer* (Black press) and *Der Nordstern* (German). **Most complete Bly coverage** (exact phrase "nellie bly", Nov 14, 1889 – Jan 31, 1890; 473 unique pages across 180 papers; undercounts "Miss Bly" and garbled mentions):

| Paper | Pages | Distinct dates | Role in the game |
|---|---|---|---|
| The Evening World (New York) | 53 | 25 | The spine. It's the sponsoring paper's evening edition and ran the contest |
| Pittsburg Dispatch | 18 | 13 | National voice; home of Bly's early career (unverified fact; check before using) |
| St. Paul Daily Globe | 17 | 13 | Midwest voice |
| Wichita Eagle | 15 | 12 | Midwest voice (from Dec 12) |
| Indianapolis Journal | 12 | 10 | Midwest voice (from Dec 13) |
| Evening Star (Washington) | 12 | 10 | National voice |

Also present: New-York Tribune and The Sun (NY), the Omaha Daily Bee, and two community papers useful for a "different communities covered the race" thread: The New York Age (Black press) and the Detroit *Plaindealer* (Black press), plus *Der Nordstern* (German). The *World*'s morning edition did not appear in any sample; assume it's not in the archive until checked. A broad search on "Bly" alone returns ~40,000 pages because the archive's search fuzzy-matches, so don't use it for counts.

Midwest, same window: 11,499 pages across 12 states (breakdown in section 6.2); Illinois pages mentioning Bly: only 3. Anchor-city front pages 1880–1930: Milwaukee 11,082, Chicago 34,275, Detroit 7,522.
- **Rights:** pages over 95 years old are public domain. Keep everything shown in Play and Explore **pre-1931**.

## 12. Stack
From Tarik's original plan, kept: **Next.js on Vercel** (web app), **Convex** (data and scheduled jobs), **Clerk** (sign-in, needed for follows and agent memory; anonymous play must work without signing in), **Hetzner VPS** (rate-limited fetch worker and batch processing; use the `hetzner` SSH alias, and ask before installing services or opening ports). The builder may swap any piece that slows them down; judges score the product, not the stack.

## 13. Left to the builder
- Exact day-budget numbers and hint costs
- Clipping thresholds for "needs cleanup" and the "human story" score
- Notification channel
- Visual design, **using the `/impeccable` skill for all UX and design work** (Tarik's call, 2026-10-28). Must work on a phone; should feel like newsprint, not a SaaS dashboard
- Exact Explore corpus size within the budget
- Prompt wording, provided the Editor gate and question-only hints hold
- Data model details, so long as every claim links to a stored clipping

## 14. Open items
- **Name:** "Then & There" is the working title. Alternatives from the earlier plan: Dateline, Halftone, The Morgue, Back Issue.
- **Editor model:** Muse Spark vs Muse Wonder. Decide by testing on 20 clues.
- **Submission form details** (video length, repo, URL fields) sit behind Tarik's Cerebral Valley login. Check before Tuesday.

## 15. Calls made during review (Claude's calls; Tarik to check)

These came out of an independent builder review on 2026-10-28. Each could have gone another way.

1. **What the Editor gates in Explore.** The Editor checks everything *generated*: summaries, type labels, "human story" picks, teacher-pack questions, historical-context notes, and translations' headline claims. Model-repaired transcription is shown as **"machine-repaired text"** with the original scan beside it; it isn't treated as a claim. Unrepaired clippings may appear in Explore, labeled. The "Editor-verified only" filter means "only clippings whose generated content passed." *Why:* running the Editor on every cleaned clipping would eat the $150 budget; showing the scan beside the text keeps the reader able to check it.
2. **"Raw page in, verified clue card out" (Goal 3).** On the site, it's a **recorded-run viewer**: a stored trace of a real pipeline run on a cached page, labeled with its run date. The demo video shows the same thing running live once. *Why:* a live on-demand pipeline risks rate limits, credits and mid-demo failure, for little gain.
3. **The agent during hackathon week.** The nightly job is keyed to a **game clock**. Before launch, the clock points at the built demo days; from Nov 14, 2026 it follows the real anniversary date. A note produced by **replaying a recent real batch** (labeled as a replay) counts toward Goal 4 and the B gate, since the content is real and the label is honest.
4. **Scans in the browser.** Users' browsers load page images and crops **directly from the Library's IIIF image server**. "One fetch per page, cached for everyone" applies to *our server's* calls (JSON API, ALTO, batch bundles). *Why:* no storage or CDN layer to build; the image server allows 150 requests/min per client.
5. **No model calls on the judging path.** Everything a judge can touch (built days, hints, "meanwhile" picks, Explore results) is pre-generated and served from cache. Live model calls are limited to the nightly agent, which degrades quietly (it logs "skipped: no credits") if credits run out. *Why:* judging happens after Nov 4, and credits may expire before it ends.
