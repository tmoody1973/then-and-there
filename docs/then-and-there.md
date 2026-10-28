# Then & There

**America's newspaper archive, made playable, with a personal agent that keeps digging for you.**

Entry for the Meta Global AI Developer Hackathon · Indie developer track · Theme: Build for Your World
Builder: Tarik Moody · Submissions due **Wednesday, Nov 4, 2026, 9:00 PM ET (8:00 PM Central)**

---

## 1. The idea in one paragraph

The Library of Congress's Chronicling America collection holds more than 23 million digitized historic newspaper pages from every state. It is free, public and keyless to query, and almost nobody uses it, because the OCR on older scans is often garbled and searching it feels like work. Then & There uses Meta's models to segment and clean those pages, then turns them into things people come back to: a daily national game, a detective chase through real coverage, side-by-side comparisons of how different papers told the same day, and guided quests. A persistent personal agent keeps working in the background, watching newly digitized pages for the places and family names you care about, and tells you only when it finds something real.

## 2. Why this fits the hackathon

**Theme: Build for Your World.** "Bring Meta's models into your domain. Solve a problem you know firsthand, free up time and mental space, and make something possible that wasn't before."

- **A problem I know firsthand.** I work in public media at Radio Milwaukee, have hosted a show about the stories behind music for 20+ years, and sit on Milwaukee's City Plan Commission, where neighborhood history shapes today's decisions. In each role I've needed a fast way into what the newspapers of the time actually said.
- **Time and mental space freed.** A producer gets a sourced history segment, a teacher gets primary sources ready to use, and a curious person has an agent doing the digging instead of them.
- **Something possible that wasn't before.** Pages nobody can search well today, including German, Polish and Black newspapers, become searchable, playable and teachable.

**Track: Indie developer.** Judged on creativity, technical ambition, and whether it works. The plan below is scoped so the demo works end to end, with ambition shown in the architecture rather than in feature count.

## 3. Who it's for

| User | What they get |
|---|---|
| Curious adults and casual gamers | A daily 2-minute game with a shareable score |
| Family-history researchers | An agent that watches new pages for their names and towns |
| Teachers and students | Primary-source activities built on real pages (roadmap: Classroom mode) |
| Radio producers and newsrooms | Sourced "this day in history" material (roadmap: daily audio segment) |

## 4. Features

### 4.1 Daily Front Page (must ship)

Everyone gets the same real front page each day, with its parts hidden. Players reveal one segment at a time (an ad, the weather, market prices, a photo, the headline, the masthead) and guess **where** (region) and **when** (year) it was printed. Fewer clues means a higher score. After locking a guess, the player sees the real page, the paper, the date, how close they were, and a "here's how you could have known" explanation.

- Scoring: start at 1,000, −150 per extra clue, plus a closeness bonus for year and region.
- Share card with score and no spoilers.
- The Game Master agent picks each day's page and orders the clues from hardest to easiest.

### 4.2 Your Agent (must ship)

A persistent agent, one per user, modeled on the design choices in Meta's Muse: long-lived memory, background work on a schedule, a high bar for interrupting, and full transparency.

- **Remembers:** your places, family names, active quests and cases, what you've already seen.
- **Works in the background:** on a nightly schedule it checks for newly added batches and searches them for your watch list, including historical spellings and old place names.
- **Interrupts rarely:** one notification only when the Editor has confirmed a genuine find.
- **Transparent:** an activity log ("checked new batches, searched for your names, Editor matched the find, sent one notification") and a memory you can read and edit.

### 4.3 Detective Mode: Case 01, Nellie Bly (should ship)

In November 1889, New York World reporter Nellie Bly set out to beat the fictional 80-day record from *Around the World in Eighty Days*. She left on November 14, 1889, returned on January 25, 1890, in about 72 days, and newspapers across the country followed her progress. The World even ran a contest for readers to guess her return time.

Players follow her trail from clues pulled from genuine pages: at each stop, they read a clue and pick the next place and date. Wrong guesses cost in-game days. The Chief, a Socratic guide, gives hints instead of answers. A case notebook collects every clipping with its citation.

- Hackathon scope: 4–5 stops (for example, New York → Amiens → Colombo → Penang → home), each backed by a real, cached page.
- The Case Writer agent proposes stops and clues; the Editor confirms each clue is solvable from what's printed.

### 4.4 One Day, Many Papers (nice to have)

Pick a date and see that day's coverage from papers across the country, side by side. Many papers ran identical wire-service copy, so the Comparer detects shared text and highlights only what each paper added, cut or moved, which is where the lesson about framing lives.

- Hackathon scope: one pre-processed date, **August 26, 1920**, when the 19th Amendment was certified, across three papers.

### 4.5 Roadmap (described in the submission, not built)

- **Spot the Forgery:** Muse Image plants one anachronism on a real page; players find it. Always revealed and labeled; altered images never leave the round.
- **Quests:** Socratic journeys through primary sources ("the Great Migration through the Black press," "my grandmother's town in the 1920s") released over days.
- **Classroom mode:** teacher-assigned quests and cases, students join by class code with no personal data, every page teacher-previewed, memory scoped to the class and deleted at term's end.
- **Live processing of any page,** daily audio segments for radio, and an open-weights deployment for schools and libraries.

## 5. Architecture

Two layers, deterministic work first, agents on top. Every claim an agent makes must point back to a stored segment.

```
                 ┌──────────────────────────── Agents (Muse Spark via Meta Model API) ─────────────────────────────┐
                 │  Your Agent (persistent)   Researcher   Game Master   Case Writer   Comparer   Editor (checker) │
                 └───────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                                 │ shared tools: search · fetch · segments · cite
┌───────────────── Deterministic pipeline ───────────────────────┴─────────────────────────────────────────────────┐
│ loc.gov API ──► rate-limited fetch worker ──► page image + raw OCR ──► SAM 3.1 segmentation ──► OCR cleanup ──► store │
│                                                                                     (open-weights / Muse Spark)        │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                 │
                                              Web app (daily game, agent, detective, comparisons)
```

### 5.1 Pipeline (code, not agents)

1. **Fetch.** A background worker queries the loc.gov API and downloads page images and the existing OCR text. It never calls the archive live on behalf of a user.
2. **Segment.** SAM 3.1 runs with short text prompts ("advertisement," "photograph," "headline," "column of text") to produce boxes and masks for each part of the page.
3. **Clean.** Each segment's crop and its raw OCR go to a model that corrects the text and translates non-English papers. Bulk cleanup can run on an open-weights model to save credits; Muse Spark handles the hard cases.
4. **Store.** Every segment is saved with its coordinates, type, raw text, cleaned text, confidence and full citation. Each page is processed once and shared by all users.
5. **Extract.** People, places and events are pulled into a small knowledge graph so exploration compounds.

### 5.2 Agents

| Agent | Job | Runs |
|---|---|---|
| **Your Agent** | Memory, watch list, background search, notifications, activity log | Nightly + on demand |
| **Researcher** | Searches like a historian: period language ("Spanish grippe"), old place names, follows "continued on page 6" | When a case or find needs evidence |
| **Game Master** | Picks the daily page, orders the clues, writes the post-game explanation | Nightly |
| **Case Writer** | Builds detective stops and clues from real coverage | Offline, per case |
| **Comparer** | Gathers a date's coverage, uses text similarity to find shared wire copy, describes what differs | Per comparison |
| **Editor** | Never sees the drafting. Checks every claim and clue against its cited segment and rejects anything unsupported | Before anything reaches a user |

### 5.3 Meta models and why each is used

| Model | Use |
|---|---|
| **SAM 3.1** (Model API) | Segmenting each page into ads, photos, headlines and articles; this is what makes the game and clean reading possible |
| **Muse Spark** (Model API) | Agent reasoning, OCR correction of hard segments, translation, Socratic hints |
| **Muse Wonder** (Model API) | Candidate for the Editor if it proves stronger at verification; test before committing |
| **Muse Image** (Model API) | Photo enhancement, always shown beside the original and labeled; the forgery round on the roadmap |
| **Meta open-weights model** | High-volume OCR cleanup to keep cost down and show a path for libraries and schools |
| **Muse Code** | The coding agent used to build the project; document this in the README |

Confirm exact model IDs and endpoints in the Meta Model API dashboard before building. The API is OpenAI-compatible with base URL `https://api.meta.ai/v1`.

### 5.4 Suggested stack

Next.js on Vercel for the web app, Convex for data and scheduled jobs, Clerk for sign-in, and the Hetzner VPS for the rate-limited fetch worker and batch processing. Swap anything that slows you down; the judges score the product, not the stack.

## 6. Data source: Chronicling America via the loc.gov API

- **Access:** public, no key, JSON via `&fo=json`.
- **Query shape:** `https://www.loc.gov/collections/chronicling-america/?{params}&fo=json`
- **Useful parameters:** `dl=page` (page-level results), `qs` (search words), `ops` (`PHRASE`, `AND`, `OR`, `~5` proximity), `start_date` / `end_date`, `location_state`, `location_city`, `fa=language:…`, `fa=number_lccn:…` (one title), `front_pages_only=true`.
- **Text:** each page's OCR is in the `full_text` JSON field.
- **Rate limits (newspapers):** burst limit 20 requests per minute (exceeding it blocks you for 5 minutes); crawl limit 20 requests per 10 seconds (exceeding it blocks you for an hour). Searches over 100,000 results are rejected, so narrow by date, title or state. Bulk OCR downloads from the legacy site are limited to 10 requests per 10 minutes.
- **What this means:** fetch slowly in the background with backoff, cache everything, and pre-fetch every page the demo needs.
- **Rights:** papers published more than 95 years ago are fully public domain. Keep the demo pre-1930.
- **Fallback for photos and ads:** the Library's Newspaper Navigator dataset already extracted visual content and can stand in if SAM struggles on dense pages.

## 7. Data model (first pass)

- **pages:** id, lccn, paper title, city, state, date, sequence, image URL, raw OCR, processed status
- **segments:** id, page id, type (ad, photo, headline, article, masthead, weather, prices), bounding box, mask, raw text, cleaned text, translation, confidence, citation
- **entities:** id, kind (person, place, event), name, variants, linked segment ids
- **users / agent memory:** watch list (names, places), seen segment ids, active cases, preferences, activity log entries
- **daily_games:** date, page id, ordered clue segment ids, answer (year, region, paper), explanation
- **cases:** id, title, stops (place, date, clue segment ids, answer, hint)
- **comparisons:** date, topic, page ids, shared-text spans, per-paper differences

## 8. Guardrails

- **Every claim is cited.** The Editor rejects anything without a matching segment.
- **Honest restoration.** Enhanced images are labeled and the original is always one tap away.
- **Hard history in context.** Old pages include racist ads, slurs and graphic crime coverage. Present them with historical context; don't hide or decorate them.
- **No surprise data use.** The watch list and memory are visible, editable and deletable.
- **Polite to the archive.** Respect the rate limits; one fetch per page for everyone.

## 9. How we'll show it works

Report these in the submission:

- **OCR accuracy:** character error rate of raw OCR versus cleaned text on 10–20 hand-transcribed segments.
- **Editor rejection rate:** share of drafted clues and claims the Editor rejected, with an example.
- **Solvability:** every daily-game and case clue checked as answerable from the page itself.
- **Cost per page:** API spend to fully process one page.

## 10. Build plan (Oct 28 – Nov 4)

| Day | Goal | Done when |
|---|---|---|
| **Wed Oct 28** | SAM spike + fetch worker | SAM segments 5 real pages acceptably, or the fallback is chosen; worker fetches and caches pages within rate limits |
| **Thu Oct 29** | Pipeline end to end | Fetch → segment → clean → store works; demo pages queued: 7 daily pages, Bly case pages, Aug 26, 1920 papers |
| **Fri Oct 30** | Daily Front Page | Game playable with real cached pages; Game Master picks and orders clues |
| **Sat Oct 31** | Your Agent + Editor | Watch list, nightly job, activity log, one real verified find delivered as a notification |
| **Sun Nov 1** | Detective Case 01 | 4–5 Bly stops playable with real clues and Chief hints |
| **Mon Nov 2** | One Day, Many Papers | Suffrage date with three papers and wire-copy highlighting |
| **Tue Nov 3** | Measure + polish | Accuracy numbers, Editor stats, mobile layout, bug fixes |
| **Wed Nov 4** | Ship | Demo video, README, submission in by mid-afternoon Central, well before the 8:00 PM Central deadline |

**Cut order if behind:** One Day, Many Papers first, then shorten the detective case to 3 stops. The daily game and the persistent agent are the core and do not get cut.

## 11. Demo script (about 3 minutes)

1. **The problem (20 s).** Show a real page and its garbled OCR next to each other.
2. **The fix (30 s).** The same page segmented by SAM, cleaned and cited.
3. **The daily game (45 s).** Reveal two clues, guess, see the answer and the explanation.
4. **Your agent (40 s).** The overnight activity log, then the notification: a family name found in a newly added paper, verified by the Editor.
5. **Detective (30 s).** One Bly stop: clue, hint, correct port, trail advances.
6. **Close (15 s).** Roadmap: classroom mode, quests, forgery round, open-weights for libraries.

## 12. Risks

| Risk | Mitigation |
|---|---|
| SAM 3.1 segments dense newspaper columns poorly | Test day one; fall back to Newspaper Navigator boxes or Muse Spark vision for article boundaries, keep SAM for visual elements |
| Archive rate limits block the build | Slow worker with backoff; pre-fetch all demo pages early |
| Scope too large for one week | Fixed cut order above; roadmap items are described, not built |
| Model output invents details | Editor check against stored segments; no uncited text reaches users |
| API credits run out | Open-weights model for bulk cleanup; cache all model output |
| Demo depends on live calls | Demo runs on cached, pre-processed pages |

## 13. Submission checklist

- [ ] Re-read the Official Rules for required materials and any rule on pre-existing work
- [ ] Working app URL
- [ ] Public repo with README: what it does, how Meta's models are used, what was built during the hackathon, built with Muse Code
- [ ] Demo video
- [ ] Measured results (OCR accuracy, Editor rejection rate, cost per page)
- [ ] Submitted before Nov 4, 9:00 PM ET

## 14. Open questions

- Final name: Then & There (current), Dateline, Halftone, The Morgue, Back Issue
- Muse Wonder vs. Muse Spark for the Editor
- Which seven pages to use for the demo week of daily games
- Whether to include a Milwaukee-specific demo region (German, Polish and Black press) in the video

## Sources

- [Meta Global AI Developer Hackathon (Cerebral Valley)](https://cerebralvalley.ai/e/meta-ai-developer-hackathon.md)
- [Win $1M: Meta Global AI Developer Hackathon (Meta)](https://dev.meta.ai/events/global-hackathon)
- [Using the loc.gov API with Chronicling America (Library of Congress)](https://libraryofcongress.github.io/data-exploration/loc.gov%20JSON%20API/Chronicling_America/README.html)
- [Chronicling America: additional features and bulk data](https://guides.loc.gov/chronicling-america/additional-features)
- [Meta brings SAM 3.1 to Meta Model API](https://digg.com/ai/icmesfai)
- [Build with Muse Image (Meta)](https://developer.meta.com/ai/resources/blog/build-with-muse-Image/)
- [How We Designed Muse (Meta)](https://introducing.muse.ai/)
- [Nellie Bly as a 19th-century sensation (InsideHook)](https://www.insidehook.com/culture/time-reporter-nellie-bly-became-19th-century-global-sensation)
- [Nellie Bly: Around the World (Heinz History Center)](https://www.heinzhistorycenter.org/learn/women-forging-the-way/nellie-bly/)
