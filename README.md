# Then & There

**Race Nellie Bly around the world in real time, 137 years later.**

On November 14, 1889, Nellie Bly left Hoboken to beat Phileas Fogg's 80 days. From **November 14, 2026 to January 25, 2027**, Then & There replays her trip one day at a time, using only what American newspapers printed that morning. Each day you read a real clipping, on the original scan, and make the call: *will she make it?*

**Play it:** https://then-and-there-flame.vercel.app
**Judges, before Nov 14:** https://then-and-there-flame.vercel.app/play?demo=1 opens every published day early.
**Find stories:** https://then-and-there-flame.vercel.app/explore · **Your desk:** https://then-and-there-flame.vercel.app/desk
**How it works, on one real page:** https://then-and-there-flame.vercel.app/how

Built for the Meta Global AI Developer Hackathon (indie track) by Tarik Moody.

---

## The problem

The Library of Congress has digitized 23.8 million pages of historic American newspapers. Almost nobody reads them. The stories aren't hidden by bad scans; they're hidden because you have to know a name before you can search for it. A Milwaukee barber praised in a Black weekly in 1898 is findable today only if you already know to type "Ellmore."

Then & There uses Meta's models to do an editor's job at archive scale: cut each page into stories, repair the text where the machine-read text (OCR) is garbled, find the human stories, and check every claim against the scan before a reader sees it. The daily race is the first way in.

## What a day looks like

1. **The dispatch.** A clipping from that date in 1889, shown on the original scan with a blue-pencil ring, plus a clean transcription and its Library of Congress citation.
2. **The Morgue.** Free background clippings from the files: what other papers had printed by then. Never anything from later.
3. **The call.** A "will she make it?" question. A wrong call costs 3 days; each question to the City Editor costs 1. You start with Fogg's 80. Finish with more than 8 left and you beat Nellie.
4. **The reveal.** What the papers printed next, on the scan, with an explanation.
5. **Meanwhile, back home.** A story from your own Midwest state's papers that same day.
6. **Share.** A spoiler-free result card.

The finale on January 25 is a ballot for her exact time, modeled on The Evening World's real 1889 contest ("A FREE TRIP TO EUROPE for the NEAREST GUESS as to the Exact Time of NELLIE BLY'S TOUR").

## Explore: the Story Finder

The second door, for teachers, students, history buffs and family researchers.

- **Shelves before search.** Nobody knows what names to type, so Explore opens on shelves of Editor-verified stories: the Black press (The Wisconsin Weekly Advocate and Detroit's Plaindealer, confirmed as Black newspapers by their Library of Congress records), the race in the papers, German Milwaukee, front pages from November 1889.
- **Search the repair and the original.** Search covers the text Muse Spark repaired *and* the archive's own OCR, so a clipping nobody repaired is still findable. Filters: state, years, language, Black press, front pages, people only, Editor-verified only.
- **Every story on its scan**, labeled honestly: "Verified" when the Editor confirmed the label against the clipping, "Machine-sorted" when it hasn't; "Machine-repaired text" or "Archive OCR text". A button puts the archive's garbled OCR beside the repair. Cite in MLA, APA or Chicago (the Library's own citations, plus where on the page the clipping sits).
- **Teacher packs:** printable sets of up to 8 verified clippings with 3 discussion questions written by Muse Spark, each checked by the Editor. Clippings flagged as hard history are left out unless the teacher opts in.

## The light personal agent

Follow a name or a place. Every night a scheduled job ([`.github/workflows/agent.yml`](.github/workflows/agent.yml)) checks the batches of pages the Library of Congress has newly added:

1. It downloads each new batch once (checking the Library's published checksum), reads every pre-1931 page's text, and matches readers' follows **in our own code**. Follows are never sent to an AI model.
2. For at most 5 candidate pages a night, it runs the same pipeline (Muse Spark + SAM 3.1), then asks the Editor whether the clipping really names that person.
3. Each reader gets at most one note a night, only for a confirmed find, on **Your Desk**, with an activity log written as it works: *"Checked 1 new batch (1,706 pages). Searched 3 follows. 5 candidates (9 more set aside). Editor confirmed 2. Sent 1 note."*

No sign-in: follows belong to a private key kept in your browser ([decision 009](docs/decisions/009-explore-and-agent-setup.md)). "Forget everything" deletes them here and on the server.

New pages arrive slowly (about 20,000 a month nationwide), so the demo **replays** a real batch added October 23, 2026, and every note and log line it writes is labeled *Replay*. In that replay, following "Cummins" produced an Editor-confirmed find, *"SENATOR CUMMINS ON SPECIAL INCOME TAX"* (Gainesville Daily Sun, July 1, 1909), for $0.04 of model spend.

## How Meta's models are used

All content is processed ahead of time. The live site makes no model calls.

| Model | Job in the pipeline |
|---|---|
| **Muse Spark 1.3** (Meta Model API) | Reads the whole page image and boxes every story, ad, headline and picture. Also drafts each game day (the Case Writer) and runs the Editor's fact checks. |
| **SAM 3.1** (Meta Model API) | Takes Muse Spark's boxes as prompts (16 per request) and traces each piece precisely, with a confidence score. Also finds illustrations by name. |
| **Muse Spark 1.3, contributor tier** | The high-volume work: re-reading garbled clippings from the image and tagging each one (person, event, business, ad; how much of a human story it holds). |

Why this split: in tests on five real pages, SAM found almost nothing when asked in words ("advertisement," "headline," "article"), but traced 16 of 16 boxes when handed them. Muse Spark boxed ads, pictures and mastheads well but returned whole columns of text instead of separate stories. So Muse Spark finds the layout, the columns are split into stories at their headlines, and SAM traces each piece ([decision 007](docs/decisions/007-segmentation-approach.md)).

**The Editor** is the trust layer. It never sees the drafting. Before a day can be published, it checks that the clue supports the question, the answer is supported by the reveal, each hint doesn't give the answer away, and each Morgue item is relevant. If a check can't run, it counts as a failure. A day with any failed check is not served.

## Measured results

From the data the live site uses (as of October 28, 2026):

| Measure | Result |
|---|---|
| Pages processed | 607 pages from 141 papers in 40 states and DC, 1887–1921 |
| Clippings cut out | 15,772 (12,557 traced by SAM 3.1) |
| Clippings re-read from the image by Muse Spark | 10,953 |
| Languages | English, German (215 pages), Polish, Danish, Swedish, Norwegian, Spanish |
| Editor checks | 1,038 run, **172 rejected (17%)**: game clues, hints and context, 681 Explore labels (561 confirmed), teacher-pack questions, agent finds |
| Cost per page | **$0.041**, from a 155-page run with nothing cached ($6.30 total: Muse Spark $3.77, contributor tier $1.47, SAM 3.1 $1.06) |
| Published game days so far | 4 (Days 16, 30, 71 and 73) |

What the Editor caught: in the first drafting run it rejected all five days. Some rejections were real (the Case Writer added facts no clipping printed, like "Mojave" and "the Central Pacific"). Others showed we were asking the Editor the wrong questions. That story is in the [learning log](docs/LEARNING-LOG.md).

**Not yet measured:** OCR accuracy (character error rate) against hand-transcribed clippings. The one verified example is on the [how it works](https://then-and-there-flame.vercel.app/how) page: the archive's OCR reads "Nellie IllyM trip"; after Muse Spark re-read the image, "Nellie Bly's trip."

## Rules the product keeps

- **The page is the proof.** Every clue and claim links to a scan you can open at loc.gov.
- **No hindsight.** You only see what had been printed by that day. Days unlock on their 137th anniversary, and a locked day's content never reaches the browser.
- **Hard history in context.** Old pages carry racist ads, slurs and graphic crime coverage. They get a calm content note, never hidden and never decorated ([decision 006](docs/decisions/006-hard-history-content-notes.md)).
- **Works when the archive doesn't.** If the Library's image server is down, the clue's text and citation still read.
- **Polite to the archive.** One fetch per page, rate-limited and backed off, with a 10-minute pause if the Library ever serves a block page.

## What was built during the hackathon

Everything in this repository. The first commit is October 28, 2026, two days into the hackathon. The git history shows the whole build, and the design decisions are written up in [docs/decisions](docs/decisions/):

- The engine: Library of Congress client, OCR parsing, segmentation with Muse Spark and SAM 3.1, text repair, tagging, the Editor, storage in Convex.
- The game: the daily race, City Editor hints, The Morgue, Meanwhile, sharing, the finale ballot, the "how it works" page.
- Explore, Your Desk, the nightly agent and teacher packs.
- Tests (257 unit and integration tests, plus phone-sized browser tests) and CI that must pass before anything reaches `main`.

**How it was built:** with Claude Code (Anthropic's coding agent) as a pair programmer. Meta's models do all of the work inside the product.

**Not built:** a chat-style agent you can talk to. By design it waits until the light agent has run two nights unattended ([decision 004](docs/decisions/004-light-agent-first.md)).

## How it's put together

```
worker/fetch.ts     download each page's OCR file and image size from the Library, once
worker/process.ts   segment → map OCR words to clippings → repair if garbled → tag → store
worker/agent/       the nightly agent: new batches → match follows locally → process → Editor → notes
scripts/game/       find Bly clippings → draft each day → Editor checks → import
scripts/explore/    Editor-verify labels, build shelves, build teacher packs
lib/                Library client, OCR parsing, segmentation, Meta clients, Editor, game rules
convex/             database schema and functions (writes require a shared secret)
app/, components/   the Next.js site
```

Stack: Next.js on Vercel, Convex, Bun.

## Run it locally

Requires [Bun](https://bun.sh) and a Meta Model API key.

```bash
bun install
cp .env.example .env              # add META_API_KEY and pick a CONVEX_WRITE_SECRET
bunx convex dev                   # creates a dev database and writes CONVEX_URL to .env.local
bunx convex env set CONVEX_WRITE_SECRET <same value as in .env>

bun worker/fetch.ts data/manifest/demo-pages.json   # download pages (slow on purpose)
bun worker/process.ts --budget 5                    # process them; stops at $5 of model spend

bun scripts/game/candidates.ts    # list Bly clippings by date (no model calls)
bun scripts/game/draft.ts         # draft days and run every Editor check; review data/game/days.json
bun scripts/game/meanwhile.ts
bun scripts/game/import.ts        # load reviewed days into Convex

bun scripts/explore/verify.ts --budget 5   # Editor-check labels on the strongest stories
bun scripts/explore/shelves.ts             # build Explore's opening shelves (no model calls)
bun scripts/explore/packs.ts --budget 1    # build teacher packs

bun worker/agent/run.ts --replay <batch> --budget 1   # one agent night, replaying a past batch

bun run dev                       # http://localhost:3000/play?demo=1
```

Checks: `bun run test`, `bun run typecheck`, `bun run e2e` (set `BASE_URL` to test a deployed site).

## Data and rights

Pages come from [Chronicling America](https://chroniclingamerica.loc.gov/) through the Library of Congress API. Every page used was published before 1931 and is in the public domain. Scans load directly from the Library's image server, and every clipping carries its citation.

## More

- [Design spec](docs/superpowers/specs/2026-10-28-then-and-there-design.md)
- [Decisions](docs/decisions/), each with the options considered and what was given up
- [Learning log](docs/LEARNING-LOG.md)
