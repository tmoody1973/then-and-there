# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Daily-puzzle players** on a phone, in a two-to-three-minute window each day: racing Nellie Bly one dispatch at a time.
- **Teachers and students** (Nov–Jan unit; Explore in a later plan): reading primary sources and judging conflicting 1889 reports.
- **History buffs and family researchers** in the Midwest: "meanwhile, back home" stories from their own state.
- **Radio producers and newsrooms**: a sourced 60-second "Where's Nellie today?" segment.
- **Hackathon judges** (Meta Global AI Developer Hackathon, indie track), who evaluate on Impact 30%, Use of Meta AI Tooling 25%, Demo 25%, Technical Depth 20%. Judging happens before the Nov 14 launch, so they play in demo mode.

## Product Purpose

America's 23.8 million digitized historic newspaper pages are readable but unread: nobody knows the names to search for. Then & There uses Meta's models to cut pages into stories, repair the text, find the human stories, and check every claim against the scan. Then it puts those stories in front of people. The first door is a daily game: race Nellie Bly around the world in real time, 137 years later (Nov 14, 2026 – Jan 25, 2027), using only what 1889 newspapers printed that day. Success: players come back the next day without a reminder, and judges remember "race her in real time, 137 years later."

## Positioning

Every clue is a real clipping from a real 1889 page, shown on the original scan with its Library of Congress citation, and checked by an independent Editor model before any player sees it. The rule is "no hindsight": players know only what readers knew that morning. TimeGuessr (photo where/when) and Redactle (progressive reveal) share mechanics, not the source, the verification, or the real-time historical serial.

## Operating Context

- Played on a phone, once a day, in short sessions; also on a laptop in classrooms.
- Each day: a dispatch (clue clipping on the scan), a "will she make it?" call, optional City Editor hints that cost days, a reveal with explanation and citation, a "meanwhile, back home" story from the player's Midwest state, and a spoiler-free share.
- Finale: the player guesses Bly's exact time, as readers did in The World's real 1889 contest ("A FREE TRIP TO EUROPE for the NEAREST GUESS…", The Evening World, Nov 29, 1889).
- A "how it works" page shows a recorded pipeline run on that Evening World page.

## Capabilities and Constraints

- **Stack:** Next.js (App Router) on Vercel, Convex, Bun. No sign-in for play; progress lives in the browser.
- **Scans** load directly from the Library of Congress IIIF image server (`tile.loc.gov`) in the browser; they can fail or be slow, so the UI must work without them.
- **No uncited or unverified claim** reaches a player; only Editor-approved days are served.
- **Scoring:** start with 80 days (Phileas Fogg's budget); a wrong call costs 3, a hint costs 1; finish with more than 8 left to beat Nellie.
- **Hard history:** old pages contain racist ads, slurs and graphic crime coverage. These are shown with a calm content note and historical context, never hidden and never decorated.
- **Never** resemble or reference Carmen Sandiego: no names, characters, organizations, look or structure. The guide is "the City Editor."
- Content is pre-generated; the app makes no model calls while judges play.

## Brand Commitments

- **Name:** "Then & There" (working title; alternatives under consideration: Dateline, Halftone, The Morgue, Back Issue).
- **Independent project** by Tarik Moody. Radio Milwaukee appears only as the builder's background, never as branding.
- **Voice:** period newsroom with a light touch. The City Editor (hints, day headlines) speaks as a gruff-but-kind 1889 city editor; buttons, labels and explanations use plain modern English.

## Evidence on Hand

- Real processed clippings in Convex (Plan 1 engine), e.g. the Homer Guardian (La.), Nov 29, 1889, "WOMAN AGAINST WOMAN. Two Girls to Go Around the World in Less Than Eighty Days"; The Evening World contest front page; "NELLIE BLY WINS."
- `data/game/candidates.json`: 189 Bly/Bisland clippings across 34 dates.
- Approved layout mockup: `.superpowers/brainstorm/91643-1793209953/content/two-doors.html`.
- **Absent, never fabricate:** player counts, testimonials, press, partner logos, 1889 reader statistics not printed in a cited clipping.

## Product Principles

1. **The page is the proof.** Every claim points at a scan a player can open.
2. **No hindsight.** Players know only what the papers had printed by that day.
3. **Two minutes, every day.** The daily loop is short and finishes cleanly; the habit is the product.
4. **Hard history in context.** Never hidden, never sensationalized.
5. **Works when the archive doesn't.** Text and citation stand on their own when a scan fails to load.

## Accessibility & Inclusion

WCAG 2.2 AA: sufficient contrast, full keyboard use, visible focus, screen-reader labels, and real text alternatives for every scan crop (the clipping's transcribed text).
