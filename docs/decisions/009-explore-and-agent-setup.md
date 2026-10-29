# 009 — Explore and the agent: no accounts, a nightly GitHub job, and a verified top slice

**Decision.** Three calls for Plan 3 (Explore and the light personal agent):
1. Follows and agent notes are tied to a private key kept in the browser, not to a sign-in account.
2. The nightly agent runs as a scheduled GitHub Actions job in the public repo.
3. The Editor checks the labels on the strongest human-story clippings only (about $5); every other label is shown as "machine-sorted."

**Why this came up.** The spec assumed Clerk accounts, a job on the Hetzner server or in Convex, and the Editor checking every label Explore shows. Three facts pushed back. Judges try the product before launch and an account wall costs them a step. The Library's new-batch downloads are 90–530 MB each (checked 2026-10-28), too large for the database's own scheduled jobs. And checking all 12,931 clippings' labels would spend $25–35 of the roughly $125 left.

**Options.**
- *Sign-in:* Clerk accounts (follows on every device; half a day of build, keys to manage, a sign-up wall for judges), or a browser key (one tap to follow; follows don't move between devices and vanish if the browser is cleared).
- *Nightly job:* GitHub Actions (free, nothing to install, each night's run is publicly visible; logs are public so they must never print anyone's follows), or a cron job on the Hetzner server (private logs; a production install and one more machine to keep healthy).
- *Explore trust:* verify every label ($25–35), verify the top slice (about $5, badge and filter for verified clippings), or verify none ($0, no verified filter).

**What we chose and why.** Browser key, GitHub Actions, top slice. Tarik made all three calls, from Claude's recommendations. Together they keep the demo frictionless, put no new service on the server, and keep budget for the agent and demo-day reruns. The rule that users' follows never go to Meta's models holds in every option: matching happens in our code, and the Editor sees only the clipping and the matched words.

**What we gave up.** Cross-device follows and real accounts. Private job logs. A "verified" mark on most of the corpus: most Explore labels stay machine-sorted, shown beside the scan so readers can check them.

**How we'll know if this was right.** A judge can follow a name from an Explore card without signing up. The nightly job runs two nights in a row on GitHub without anyone touching it, and its public logs contain counts only. The Editor's verify run for Explore stays at or under its $5 cap.

**What actually happened.**
