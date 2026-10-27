# Grafeat — Slice B Implementation Brief (Revised, authoritative)

**Status:** Approved product direction; implementation requires the gates below. This document supersedes the previous Slice B prompt and Phase 0 notes wherever they conflict.

## Mission and pilot outcome

Build the first real organizer workflow: authenticate into existing workspace → create challenge → discover public Instagram hashtag submissions through the **existing Facebook Login connection** → verify organizer @mentions → view usable artwork in a gallery → select/reject → rerun sync without losing state. Aim for a usable November 1 Callivember pilot. Keep the scope lean and observable.

**Do not rebuild Slice A:** Next.js/React/TypeScript, Neon PostgreSQL/Drizzle, Better Auth organizations, `assertWorkspaceMembership`, Meta OAuth and encrypted credentials, rate-limit primitive, Resend, existing dashboard. Inspect the current repository and migrations before changing anything. HANDOVER.md is stale; source code and live schema are authoritative.

**Known connection:** Workspace has a Facebook Login Meta connection for `the_calligrail` (the organizer); Instagram Login may refer to a *different* participant account. The Facebook Login token/IG professional ID is required for the verified discovery path. Never substitute the Instagram Login token. No token values in logs or API responses.

## Locked product decisions

1. **We sell processing capacity, not gallery visibility.** Do not cap the number of previously processed eligible submissions a user may view. A processed submission stays available for the life of the challenge and afterward.
2. **No daily reshuffling and no permanent creator locking.** Plan allowances govern *candidate eligibility evaluations* (processing), not displayed posts, unique creators, or carousel slots.
3. **No first-come-first-served processing.** Discover a representative pool for a challenge day, then randomly allocate processing slots. Preserve unprocessed candidates as a backlog; upgrading can process additional candidates without replacing processed ones. Do not claim a mathematically fair sample of all hashtag posts unless discovery is complete; make partial coverage visible.
4. **One organizer-facing `Sync now` / `Continue sync` action.** Discovery, processing/verification, and backlog progress are independently resumable internally. Repeated syncs are idempotent. A sync may process pending backlog even without new discoveries.
5. **Dates:** Store start/end as date-only plus an IANA challenge timezone, defaulted from browser. Determine eligibility and daily processing budget by the challenge-local calendar date; preserve original media timestamp in UTC. `ended` is derived from an `active` challenge's end date, not persisted. Draft remains draft. Ended challenges stay reviewable and syncable.
6. **Review is independent of eligibility and processing.** Keep unprocessed, pending/error, verified, ineligible, and selected/rejected states separate. The main gallery contains processed eligible submissions; diagnostics can expose others without presenting them as ready for featuring. Sync must never overwrite curator selections.
7. **No manual submission injection or preferential treatment in Slice B.** Don't implement favorite-account priority, forced inclusion, or manually adding missing posts. Keep the architecture extensible for future editorial tools, but do not build them now.
8. **Pricing is provisional, not a billing feature in Slice B.** Working tier hypotheses: $12 / $24 / $49 / $99 per month, capacities 50 / 200 / 750 / 2,500 processed candidates per day, plus custom high-volume tier; annual at 20% off 12 monthly payments. These are assumptions to validate, **not** a mandate to hard-code paid tiers or implement Stripe. Pilot can use a configurable dev capacity, ideally unrestricted to establish actual volumes and API feasibility.
9. **Engagement is a distinct future subsystem.** Organizer-configurable daily auto-like target in the **100–300/day** product range, constrained by plan. Recommend a target using the connected organizer account's follower count; recommendation is not a forced setting. Actual available range and execution must be constrained by verified Meta permissions/rate limits and anti-abuse rules. No assumption that API can like arbitrary public Personal-account posts. Likes should conceptually target eligible posts, not just the gallery sample. Comments on featured posts are separate and future. **Do not implement auto-like/comments in Slice B.** Preserve suitable extension points without speculative schemas unless needed.
10. **Carousel is out of Slice B.** When implemented, cap composition by the actual supported publishing method/API, verified from current official Meta documentation/testing; don't advertise 20-item direct publishing if API supports only 10.

## Required technical discovery gate — before gallery implementation

Run a focused Meta API experiment with the existing Facebook Login organizer connection and real public Personal-account test posts. Previously validated:
- `GET /ig_hashtag_search?user_id={organizer_ig_id}&q={hashtag}`
- `GET /{hashtag_id}/recent_media?user_id={organizer_ig_id}&fields=id,caption,permalink,timestamp&limit=50` with pagination
- `GET /{organizer_ig_id}?fields=mentioned_media.media_id({candidate_media_id}){id,username,caption}` to check genuine organizer mentions.

These methods are **reported/experimentally verified**, not blanket permission to assume all fields work. Check whether discovery or verified mention endpoints provide usable `media_type`, `media_url`, `thumbnail_url`, or an officially supported image display mechanism for public Personal-account posts. Log only safe response metadata; document exact tested requests, responses, account types, API version, and limitations. Do not scrape Instagram pages or synthesize image URLs. **If artwork thumbnails cannot be obtained compliantly, STOP before building the visual gallery and report options.** Also explicitly track whether IPCA/Advanced Access is approved for non-role external organizers; successful developer-account OAuth is not sufficient evidence.

## Proposed schema — refine before writing SQL

Design additive tables consistent with existing Drizzle conventions:

- `challenge`: id, organizationId FK, name, normalized hashtag (without #), cached hashtagId, requiredMention snapshot of organizer username, startDate, endDate, timezone, persisted status (`draft|active`), timestamps. Associate the correct Facebook Login organizer connection/account, and define behavior if it is disconnected/reconnected. Validate dates/timezone/hashtag.
- `submission`: id, challengeId FK, mediaId, permalink, caption, nullable creatorUsername, nullable verified media fields, publishedAt, challenge-local submission day (stored or reliably derived), discovery/processing/mention/eligibility states, mentionCheckedAt, curator review status (`unreviewed|selected|rejected`), timestamps. Unique `(challengeId,mediaId)`; protect reviewStatus from sync upserts. Define whether a failed verification consumes a processing unit, retry semantics, and stable status transitions.
- `sync_run`: challengeId FK, status, safe pagination cursor (never full URL), discovery/verification/allocation progress counters, started/completed timestamps, sanitized errors; allow bounded resumption and observability.
- `sync_lease`: challengeId PK/FK, lockedUntil, lockedBy; acquire atomically via INSERT...ON CONFLICT UPDATE WHERE expired, renew/release safely, expire on crashes.
- **Processing allocation:** propose the minimum schema needed to persist *which candidates were allocated to processing for which challenge-local day*, a stable random key/selection, processing budget usage, and backlog. Avoid conflating this with gallery visibility. Design for eventual entitlement upgrades and auditability. Do not overbuild subscriptions.

Ensure database-level uniqueness, indexes for `(challengeId, publishedAt)`, processing backlog, gallery filters, and ownership joins. Use parameterized SQL and no client-supplied workspace trust.

## Processing fairness and incomplete discovery — propose explicitly

For a challenge day with more discovered candidates than capacity, select candidates without API-order bias, using a persisted random ranking/seed or equivalent. Never silently discard or replace already processed submissions. The discovered candidate pool may be incomplete or changing; make the tradeoff explicit. Recommend delaying final allocation for yesterday's day until a reasonable discovery cutoff, while supporting a pilot's manual sync. Define what happens when late posts arrive, the cursor expires, sync stops halfway, quota increases, a day is partially processed, and the challenge ends. Distinguish 'discovered candidates', 'processed eligibility checks', and 'eligible results'. Quotas must count the actual chosen processing unit consistently and avoid double charging on retry. **Present algorithm and its fairness limitations for approval before implementation.**

## Routes and UI (adapt to repository patterns)

- `/dashboard/challenges` list, `/dashboard/challenges/new` creation, `/dashboard/challenges/[id]` detail/gallery.
- Authenticated API routes for create, update status/settings as needed, sync, and review actions. Follow existing API-route/fetch patterns, not a new framework.
- Use `assertWorkspaceMembership(db,userId,organizationId)` for every access path, including submission actions by joining through parent challenge. Enforce workspace isolation in queries, not only page navigation.
- Create form: name, hashtag, required mention (derived from connected Facebook organizer account, read-only unless justified), start/end dates, IANA timezone; friendly validation and error states.
- Challenge detail: `Sync now`, clear progress/completeness, counts for discovered, processed, eligible, backlog, verified/errors, gallery of eligible processed artwork (subject to media gate), select/reject, persistent filters. Responsive, accessible, use existing Grafeat design tokens and branding.
- Do not add fake buttons, paid-plan gating, Stripe, publishing, engagement, or automatic cron for pilot.

## Sync engine constraints

- Use the **Facebook Login** token and IG Professional ID; cached hashtagId avoids the ~30 unique hashtag searches per IG user per rolling 7 days limit. Reuse stable test hashtag.
- Paginate bounded by pages, items, time budget and Meta errors; Vercel Hobby environment requires explicit safe bounds. Cursor can be invalidated; recover by restarting discovery safely with dedup. A previous completed scan cannot permanently suppress new posts.
- Persist progress incrementally; maintain independent discovery and verification backlogs. Safe retries, atomic lease, no duplicate submissions or lost curator decisions.
- Verify actual organizer @mention using `mentioned_media.media_id(...)`, not mere caption text matching. `creatorUsername` may be unavailable for unverified posts. Capture media fields only if officially supported.
- Robust handling for token expiry, permissions, Meta errors/429, partial results, deleted media, stale usernames, network failures, and disconnected organizer account; actionable organizer-facing messages without leaking secrets.

## Testing and manual acceptance

Add Vitest/PGlite tests following repository conventions for: membership isolation (two workspaces), create validation, date boundaries in timezone including DST, uniqueness/idempotent upserts, review persistence, processing budget counting and retry, stable random allocation, partial sync/resume, expired cursor recovery, atomic lease concurrency/expiry, API errors, eligibility/mention states, and auth guards. `tsc --noEmit` and full test suite must pass.

Manual pilot with `@the_calligrail` Facebook Login organizer and two public Personal participant accounts: one authentic organizer mention and one hashtag-only, ideally with same hashtag. Check image availability and statuses, repeat sync, refresh, select/reject persistence, timezone, backlog behavior. Do not fabricate successful Meta results.

## Execution gates and reporting

**Phase 0 (first, STOP for approval):** Reinspect live code/schema, report discrepancies. Show (a) revised schema, (b) stable random processing algorithm and fairness limitations, (c) late-arrival/incomplete-scan behavior, (d) capacity usage/accounting plan, (e) exact additive migration SQL, (f) media experiment plan, and (g) risk/permissions status. Do not modify DB or code until approved.

**Phase 1:** Implement approved schema and challenge CRUD. Show migration SQL and get explicit approval **before applying to Neon**. Report tests. No commits/pushes/deploys unless approved.

**Phase 2:** Run media-availability experiment and document evidence. **STOP** if compliant usable imagery is unavailable; do not build an unusable caption-only gallery without a product decision.

**Phase 3:** Implement bounded, resumable discovery, verification, processing allocation, gallery, and review controls according to approved algorithm. Report tests and tradeoffs.

**Phase 4:** Real-account acceptance tests, failures, remaining IPCA/App Review blockers and launch checklist. Do not imply that an external organizer can connect until Meta Advanced Access is confirmed.

**General:** Preserve existing data, OAuth flows, token encryption, and branding. Do not change secrets, invent API capabilities, or add unnecessary dependencies. Do not commit, push, deploy, or run migrations without the user's explicit approval.
