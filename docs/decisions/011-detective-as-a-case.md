# 011 — Detective becomes a case you play at your own pace

**Decision.** Detective follows Tarik's mockup: one case, "The race around the world," played stop by stop along Nellie Bly's real route. Each stop shows one real clipping and asks where the next dispatch comes from. It replaces the daily serial of decision 002, where dispatches unlocked on their 137th anniversaries.

**Why this came up.** The mockup (pages 4 and 10) draws Detective as a trail of ports with a clue card, four port choices and a case notebook, and Today labels it "Case 01 · 1889–90." The serial the site already had did not fit that picture. It had four published dispatches, all asking schedule questions ("ahead or behind?"), and the first one unlocks Nov 29. That is after the Nov 4 deadline, so judges would have met locked pages unless they found preview mode.

**Options.**
1. *Re-skin the serial in the mockup's look.* Keep the four dispatches and the anniversary unlocks. Cost: no trail to draw, schedule questions instead of ports, and locked pages during judging.
2. *Build the case from the mockup, reusing the engine and scoring.* Keep the 80-day budget (−3 for a wrong call, −1 for each question to the City Editor) and the finale ballot. Build a new set of clues, one per port, chosen by the Game Master and checked by the Editor. Cost: one more build script, a targeted fetch, and the daily-return hook of the serial.
3. *Both: the case now, the serial unlocking from Nov 14.* Cost: two Detective games competing for one tab, and twice the content to check.

**What we chose and why.** Option 2. Claude made the call, reading the mockup as the approved comp (decision 010). The route and the decoy ports are fixed facts written into the code. The clues and every line shown about them come from the papers:
- A clipping qualifies for a stop only if it names Bly and the port, was printed after she got there, and does not name the next port.
- The Game Master picks one qualifying clipping and writes a one-line summary, a notebook headline and the City Editor's nudge.
- The Editor checks the summary against the crop, and checks that the nudge doesn't give the answer away.
- If no clipping passes for a stop, that stop is left out of the case. The trail still shows the port, marked "No dispatch in our files."

**What we gave up.**
- The daily ritual, a reason to come back each day.
- The old schedule questions, which asked players to reason about time, not just geography.
- Old dispatch pages still load by direct link (`/play/16`), but nothing links to them any more.
- Anyone can find the answers by reading the page's code. They are the historical route anyway, and nothing is shared or ranked, so hiding them would protect nothing.

**How we'll know if this was right.** A first-time player on a phone can finish the case without help. Every stop's summary passed the Editor. In a demo run-through, a judge reaches the finale ballot in under ten minutes.

**What actually happened.**
