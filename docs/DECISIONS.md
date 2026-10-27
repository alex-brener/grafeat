# Grafeat — Product & Architectural Decisions (Slice B)

Decisions agreed across the Slice B reconciliation/implementation process, current as of 2026-10-27. Each entry is marked **[IMPLEMENTED]** (built and tested, described in detail in `docs/HANDOVER.md`) or **[FUTURE]** (agreed direction, deliberately not built yet — no schema, no code, unless noted). Superseded or revised decisions are marked as such rather than silently removed.

## Core monetization model

**Processing capacity is the monetized resource, not gallery visibility. [IMPLEMENTED — schema and accounting; NOT billed]**
Grafeat sells the right to have candidates *evaluated* against eligibility/mention rules, not a cap on how many already-processed results an organizer can view. There is no limit anywhere in the schema or code on viewing previously completed submissions.

**Processed submissions remain visible permanently. [IMPLEMENTED]**
A `submission` row that reaches `processingStatus = 'completed'` stays queryable for the life of the challenge and after — nothing ever reverts it to `pending`, deletes it, or hides it based on later capacity/plan changes. Visibility (a future gallery's concern) and processing-capacity accounting (`processing_budget`) are architecturally separate tables with no shared gating logic.

**No preferential creator treatment in Slice B. [DEFERRED — architecture kept extensible, nothing built]**
No favorite-account priority, no forced inclusion, no manual submission injection. The `processing_budget`/allocation design is deliberately separate from `submission`'s core fields specifically so a future priority/favorites dimension could be added later without a breaking migration — but nothing like that exists now.

## Allocation algorithm

**Stable random allocation from the discovered pool, never API/discovery order. [IMPLEMENTED]**
Each `submission` gets a permanent `allocationRank` (uniform random, DB `random()` default, assigned once at discovery and never recalculated). The processing engine always selects a day's backlog ordered by this value ascending — never by `publishedAt`, never by discovery/API order. This is what makes the sample "fair" within whatever was discovered, rather than biased toward early posters.

**Three-hour processing grace period. [IMPLEMENTED, revised from an initial 24h proposal]**
A challenge-local publication day only becomes allocatable `processingGracePeriodHours` (default **3**) after that day ends in the challenge's timezone — e.g. a Nov 1 submission becomes eligible for processing Nov 2 at 03:00 challenge-local time. This absorbs Instagram's hashtag-indexing lag before the engine draws its "final" random sample for a day. Configurable per challenge (`challenge.processingGracePeriodHours`), no UI yet.

**Challenge-local publication-day budgets, not sync-execution-day budgets. [IMPLEMENTED]**
`processing_budget` is keyed by `(challengeId, challengeLocalDay)` — the day a post was actually *published*, in the challenge's timezone — never the day a sync happened to run. This is what makes the next decision possible.

**Historical unused capacity remains available. [IMPLEMENTED]**
An organizer who syncs after several missed days finds every historical day's unused budget still intact and spendable — budget rows never expire, never get "closed," and a capacity increase simply unlocks more of that day's existing backlog without disturbing already-`completed` rows. A capacity *decrease* below `consumed` is allowed (the DB does not enforce `consumed <= capacity`, deliberately — see `lib/db/schema/processing-budget.ts`'s comment) and never un-processes anything; remaining budget just reads as zero.

**"Prioritize yesterday's submissions today." [IMPLEMENTED]**
Among challenge-local days that have cleared their grace period and still have backlog + budget, the allocation engine spends budget on the **most-recent eligible day first**, falling back to older backlog only once the most recent day's budget is exhausted. This is a cross-day ordering preference only — within one day, selection is still unbiased random by `allocationRank`.

**Fairness cannot be guaranteed when discovery is incomplete. [ACKNOWLEDGED, not resolved]**
Meta provides no total-count endpoint. Allocation is only unbiased *within whatever was discovered by the time a sync ran* — never provably a complete sample of everything that exists under a hashtag. This should be surfaced to organizers as "partial discovery," not implied completeness, whenever a gallery/stats UI is built.

## Retry and rate-limit handling

**Exactly-once, atomic budget accounting. [IMPLEMENTED]**
A single DB transaction conditionally charges `processing_budget.consumed` and transitions the submission to `completed`, each guarded so the other's failure rolls both back — see `docs/HANDOVER.md` §9 for the exact mechanism. `error_permanent` (a technical failure) never consumes a unit; only a successful evaluation does.

**Connection-wide rate limiting is distinct from submission-specific failures. [IMPLEMENTED, revised from an earlier version that incorrectly counted it against the candidate]**
A rate-limited response stops the whole processing run and is reported as an actionable `rateLimitedUntil` on the sync result — it never increments the triggering candidate's `retryCount` and never marks the Meta connection broken. See `docs/HANDOVER.md` §9.

**Bounded retry with exponential backoff, extendable by `Retry-After`. [IMPLEMENTED]**
Five attempts, 1/2/4/8/16-minute generic schedule, extended (never shortened) by an explicit `Retry-After` hint when Meta provides one on a per-submission transient failure.

## Future engagement features — explicitly not built

**Likes/comments are a separate future feature from processing capacity. [FUTURE — no schema, no code]**
No shared quota, no shared tables with the processing-budget system described above.

**Future likes target: configurable within plan limits, ~100–300/day, with follower-based recommendations. [FUTURE — product hypothesis only]**
Organizers will eventually set a daily auto-like target in roughly the 100–300/day range, bounded by their subscription plan; Grafeat will recommend a starting value based on the connected account's follower count, but the organizer makes the final choice within the permitted range. Actual feasibility (can the API even like arbitrary public Personal-account posts? what rate limits apply?) is **unverified** — nothing about this has been tested against the real Meta API. No `engagement_setting`, no like-ledger table, no UI exists.

**Carousel generation and publishing are deferred. [FUTURE — no schema, no code]**
When eventually built, composition must be capped by whatever the actual supported publishing API allows (verified from current Meta documentation/testing at that time), not assumed.

## Open risks carried forward (not decisions, but load-bearing caveats)

**External-organizer Meta permissions/Advanced Access remain unverified. [OPEN RISK]**
Everything tested so far used the one development `@the_calligrail` connection. Whether Meta has granted Advanced Access for arbitrary external Grafeat organizers in production is unconfirmed — see `docs/HANDOVER.md` §10 and `docs/meta-api-experiments.md`'s "Working API access vs. approved Advanced Access" section. Must be checked directly in the Meta App Dashboard before onboarding a second organizer.

**Meta CDN image URLs (`media_url`) may be temporary. [OPEN RISK]**
Confirmed signed/expiring (visible `oe=`/`oh=`/`_nc_*` query parameters) in the live experiment. Any gallery implementation must not treat a stored `media_url` as permanently valid — re-fetch or cache, don't assume.
