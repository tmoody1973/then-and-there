# 013 — The talk-to agent (Option B) moves to the roadmap

**Decision.** The chat agent of spec section 6.4 is not built for the hackathon. The nightly agent (Option A) ships as it is, and the remaining days go to polish and the demo video.

**Why this came up.** The spec allowed Option B only if Option A had proven itself by Mon Nov 2. "Proven" meant three things: two nights in a row with nobody touching the job, an activity log that matched what really happened, and one real note the Editor (the model that checks every find against the scan) had confirmed. Starting B without that would have meant building a chat window on a nightly job nobody trusted yet.

Where things stood on Nov 2:
- **Real verified note: yes.** On Nov 1 at 23:31 UTC the agent found a follow in a Guam batch the Library had just added. The Editor confirmed it against the scan and a note was saved (not a replay).
- **Two clean nights: no.** Nov 1 needed two manual runs and two fixes. Both runs were stopped by GitHub's 60-minute limit with nothing printed. The fixes were a retry when the Library refuses a download, and a time limit on every network call. Nov 2's scheduled run was the first clean one: 47 minutes, $0.0093 of model spend.
- **Log matched reality: no.** The Nov 1 run delivered its note but was killed before it wrote the night's log line.

**Options.**
1. *Move B to the roadmap.* Cost: no chat with the archive in the demo. The agent stays "it works while you sleep," not "talk to it."
2. *Build B anyway on Nov 2–3.* Cost: about two days of a solo builder's last three, taken from polish and the video. It would also be built on a job with one clean night.
3. *A thin B: a search box over processed clippings, no chat.* Cost: about half a day. It is a feature Explore already covers, dressed up as an agent.

**What we chose and why.** Option 1. Tarik made the call on Nov 2. Claude recommended it, and the spec's own rule says the same: two of three conditions were missed, so B goes to the roadmap. The one real find is already the strongest agent moment for the demo, and Replay can show more without pretending.

**What we gave up.**
- The most "agentic" feature in the plan, which judges at an AI hackathon may look for first.
- A proof that the nightly agent survives a run of nights. One clean night is all we have before the deadline.
- Known weak spots stay as they are:
  - 3 of 5 candidate pages on Nov 2 were skipped because the Library's search didn't list them yet.
  - The run used 47 of its 60 minutes, so a slow night could still be cut off.

**How we'll know if this was right.** The demo video and the polish pass are both finished by Wed Nov 4, 9 PM ET, without a late scramble. The nightly job runs clean on Nov 3 and Nov 4, and each night's log line matches the notes it actually sent.

**What actually happened.**
