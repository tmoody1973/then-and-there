# Demo video: script and shot list

**Length:** about 3:00. The public hackathon page gives no limit. Check the submission form (behind the Cerebral Valley login) before recording, and use the cut order at the end if the limit is shorter.

**What the judges weigh** (spec, from the Official Rules): Impact 30%, Use of Meta AI tooling 25%, Demo 25%, Technical depth 20%. Every section below names which one it serves.

**The thread:** the stories are online but unread, because search only works if you already know the name. Then & There opens three ways in: stories come to you (games), shelves that need no name (Explore), and an agent for when you do have a name. Sections 3, 4 and 5 show those ways in, in that order.

**Voice-over:** generated, not recorded: ElevenLabs Eleven v4, voice "Laura", third person. The text that was read is in [demo-voiceover.md](demo-voiceover.md); the quoted voice-over blocks below are the earlier first-person draft. The rendered cut runs 2:58, under the 3:00 cap.

---

## Before you record

1. **Two browser windows.**
   - Window A, for the games: a fresh Chrome profile or a guest window, so no game is already answered.
   - Window B, for My Agent: the browser that owns your follows.
2. **Sizes.** Laptop shots at 1440 wide. Phone shots in DevTools device mode at 390 × 844, or on a real phone.
3. **My Agent is already recorded** (section 5). Only re-record it if a clip fails. To get the demo reader's view back in window B:
   - In the terminal, from the project folder:
     `sed -n "s/^DEMO_READER_KEY=//p" .demo-reader.env | pbcopy`
     This copies the key without printing it.
   - In window B's DevTools console:
     `localStorage.setItem("tt.agent.key.v1", "PASTE")`
     Then reload. My Agent should show the Nora Mullin replay find.
   - Never click "Not my family" on it: that removes the note from the live site.
4. **The night log stays out of frame.** Its top lines are stale (see section 5).
5. **Never show:** a terminal holding a key, the `.env` files, or the Convex dashboard.
6. **Optional check:** search "Ellmore" in Explore. If the 1898 Wisconsin Weekly Advocate clipping comes up, use shot 4c. Otherwise skip it.

---

## 1. The problem, and the three ways in (0:00–0:30) · Impact

| Shot | Screen | Action |
|---|---|---|
| 1a | Laptop, https://then-and-there-flame.vercel.app/how | Hold on the full 1889 scan at the top. Slow scroll or zoom. |
| 1b | Laptop, / (Today) | Slow scroll past the games, the Story Finder link and the agent panel, in time with the last two sentences. |

**Voice-over:**
> The Library of Congress has scanned 23.8 million pages of American newspapers. Almost nobody reads them, because search only works if you already know what to type. In 1898, a Black weekly in Wisconsin called an Appleton barber, J. E. Ellmore, "the smartest gentleman of our race." That page is online. You'd never find it without his name.
> Then & There opens three ways in. Stories come to you as daily games. The Story Finder opens on shelves of verified stories, no name needed. And if you do have a name, a family name or a hometown, an agent watches new pages for it.

---

## 2. How Meta's models do an editor's job (0:30–1:00) · Meta tooling, Technical depth

| Shot | Screen | Action |
|---|---|---|
| 2a | Laptop, /how | Scroll through the steps: the boxes, the traced pieces, the clue. |
| 2b | Laptop, /how, "One repair, up close" | Hold on "Nellie IllyM trip" beside "Nellie Bly's trip". Short. |
| 2c | Text card, made in your editor | 607 pages · 141 papers · 15,772 clippings · $0.041 a page · the Editor rejected 17% |

**Voice-over:**
> To do that, Meta's models do an editor's job. Muse Spark reads the whole page image and boxes every story, ad and headline. SAM 3.1 traces each piece. Muse Spark picks out the human stories, and re-reads the scan where the archive's text is garbled. Then a second check, the Editor, compares every clue and claim against the scan. If it can't confirm something, readers never see it. So far that's 607 pages from 141 papers, at about four cents a page, and the Editor has rejected 17% of what was drafted.

*The numbers are from the README, dated Oct 28. If they've been re-measured since, use the newer ones.*

---

## 3. First way in: the stories come to you (1:00–1:40) · Demo, Impact

Record on the phone size. It shows the site works on a phone.

| Shot | Screen | Action |
|---|---|---|
| 3a | Phone, / (Today) | Hold on "Where and when was this printed?", then tap **Play today's page**. |
| 3b | Phone, /front-page | Reveal a clue. Set the year slider, pick a region, lock the guess. |
| 3c | Phone, /play | Stop 1, "Leaving New York, Nov. 14". Show the clipping on its scan and "A wrong port costs N days". Ask the City Editor once, then pick a port. |
| 3d | Laptop, /one-day | The Aug 26, 1920 papers: gray wire copy, red for each paper's own words. Tap **Only what changed**. |
| 3e | Laptop, /forgery | The real page with one planted fake. Make a guess, then show the red "ALTERED FOR A GAME" band. |
| 3f | Laptop, /quests | The Great Migration quest opening, 2 seconds. |

**Voice-over:**
> The first way in: the stories come to you. In the Detective case, you follow Nellie Bly's 1889 race around the world, using only what the papers had printed by then. On August 26th, 1920, gray is the wire story every paper shared, and red is what each paper wrote itself. In Spot the Forgery, Meta's Muse Image changes one thing on a real page, always labeled as altered.

---

## 4. Second way in: no name needed (1:40–2:00) · Impact

| Shot | Screen | Action |
|---|---|---|
| 4a | Laptop, /explore | The shelves: the Black press, German Milwaukee. |
| 4b | Laptop, /explore | Open one clipping. Show the "Verified" label, the scan, and **Cite** → MLA. |
| 4c | Optional | Search "Ellmore" and open the 1898 clipping, which closes the loop from the hook. |

**Voice-over:**
> The second way in needs no name at all. The Story Finder opens on shelves instead of a blank search box: the Black press, German Milwaukee, the race in the papers. Every story sits on its scan, says whether the Editor verified it, and cites itself.

---

## 5. Third way in: an agent for your name (2:00–3:05) · Meta tooling, Technical depth, Impact

Already recorded by Claude on Nov 3, from the demo reader's browser. All three clips are real: the follow, the run and the note happened on the live site.

| Shot | Clip | What's on screen |
|---|---|---|
| 5a | `/private/tmp/claude-502/-Users-tarikmoody-Projects-then-there/95f943cf-a9c7-4865-b3c6-1575acbe52da/scratchpad/video/raw-follow/page@5ebd20705ce5ef00ade52645a29075af.webm` | My Agent: typing "Nora Mullin" into the add box, then it appears under "Watching for you". |
| 5b | `/private/tmp/claude-502/-Users-tarikmoody-Projects-then-there/95f943cf-a9c7-4865-b3c6-1575acbe52da/scratchpad/video/clip2a-note-card.mp4` (5.8 s, 1080p) | The note: "REPLAY FIND · 09:50", "Nora Mullin" in Gainesville Daily Sun, July 1909, "The Editor checked it against the page." |
| 5c | `/private/tmp/claude-502/-Users-tarikmoody-Projects-then-there/95f943cf-a9c7-4865-b3c6-1575acbe52da/scratchpad/video/clip2b-nora-mullin-clipping.mp4` (19.2 s) | "Open clipping": the scan opens, scrolls down the Melrose column, and holds about 7 s on the Nora Mullin paragraph with the Library citation below. |

**Voice-over:**
> The third way in is for when you do have a name. Give the agent a family name or a town. Every night it reads every page the Library of Congress just added. The matching happens in our own code; your list never goes to an AI model. New pages arrive slowly, so to show it at work I replayed a batch the Library added on October 23rd, 1,706 pages of the Gainesville Daily Sun, and gave it one name I knew was in there. It read every page, found the name, and the Editor checked the scan to confirm it really names a person. Then it left this note, labeled Replay. July 1st, 1909: "Miss Nora Mullin left yesterday for a long visit with her sister in Tampa. Her smiling face will be much missed at the postoffice window." The same agent runs every night on new pages. On November 1st it found a real match in pages from Guam the Library had published days before.

*Hold 5c on the Nora Mullin paragraph while the quote is read. If it runs long, cut the last two sentences (the Guam line) first.*

**Keep off screen:** the night log under the note. Its top lines are stale, from a run that couldn't download the batch, which is why 5b is cropped and 5c starts after the log has scrolled away. Don't use the GitHub Actions page either: the replay run shows as "cancelled". It hit the 60-minute limit after leaving the note (fixed in PR #15).

---

## 6. Close (3:05–3:25) · Impact

| Shot | Screen | Action |
|---|---|---|
| 6a | You on camera, or the Today page | Put the URL on screen: then-and-there-flame.vercel.app |

**Voice-over:**
> I'm Tarik Moody. I work in public radio in Milwaukee. Finding the human story in old material is my job; Then & There does it across millions of pages. Nellie Bly's race starts again November 14th.

---

## Cut order if it runs long

Each way in keeps at least one shot, so the three-ways-in promise from the hook holds.

1. Shot 3f (Quests).
2. The Guam line at the end of the section 5 voice-over.
3. Shot 3b. Keep the Front Page as the 3a hold only.
4. Shot 4b. Keep the shelves (4a).
