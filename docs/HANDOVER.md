# Grafeat — Handover (Slice B, Phases 1–3 complete)

**Status as of 2026-10-27.** This supersedes the root-level `HANDOVER.md` for anything related to challenges, discovery, or processing — that file predates the database/schema entirely and is explicitly stale for this area. `SPIKE-RESULTS.md`, `DECISION.md`, and `docs/meta-api-experiments.md` remain the authoritative historical record of the earlier Meta API spike and are not rewritten here — this document cites them rather than duplicating them.

Source code and the live Neon schema are authoritative over any document, including this one, if they ever disagree.

## 1. Project purpose and architecture

Grafeat helps organizers of Instagram art challenges (e.g. "Callivember") discover public hashtag submissions, verify genuine organizer mentions, and curate a gallery of eligible artwork — without requiring participants to connect their own Instagram accounts.

Three layers:
1. **Public marketing site** (`app/landing/*`) — a complete static/interactive page, including a client-side-only "Challenge Curator" demo (`app/landing/curator/*`) that is **not** reusable backend infrastructure, despite looking finished.
2. **Workspace/organizer product** (`app/dashboard/*`, `app/api/*`) — real auth, real Meta OAuth, a real Postgres-backed challenge/submission pipeline. This is what Slice A/A.1/B built and what the rest of this document describes.
3. **Legacy manual diagnostic routes** (`app/api/discovery/*`) — pre-Slice-B, query-param-driven, one-off test tools from the original spike. Unrelated to the production pipeline below; left untouched.

## 2. Technology stack

- Next.js 15 (App Router), React 18, TypeScript, strict mode.
- Neon Postgres via `drizzle-orm` (`drizzle-orm/node-postgres` in production, `drizzle-orm/pglite` in tests).
- Better Auth (`organization` + `magic-link` plugins) for session/workspace auth.
- Vitest + PGlite (in-memory WASM Postgres) for tests — every test runs every migration file in order, so tests exercise the real migration-produced schema, not a hand-maintained shape.
- No queue/cron/background-job infrastructure. All discovery/processing work happens synchronously inside one HTTP request, bounded to fit Vercel Hobby's ~300s execution ceiling (see §7).
- Deployment target: Vercel (see §13 — not yet deployed for this slice).

## 3. Authentication and workspace model

`lib/auth.ts` configures Better Auth with the `organization` plugin at `membershipLimit: 1` — **one member per workspace**, multi-member teams explicitly out of scope. Sign-in is magic-link email (`lib/email.ts`; logs the link to console until `RESEND_API_KEY` is set) plus optional Google OAuth if `GOOGLE_CLIENT_ID`/`SECRET` are set.

`lib/workspace-bootstrap.ts`'s `ensureActiveWorkspace(headersList)` is called at the top of every dashboard page: a brand-new user has zero organizations until this runs once, creates exactly one workspace, and sets it active. Not a database hook — an explicit app-level step using the same server session the rest of the app trusts.

`lib/workspace.ts`'s `assertWorkspaceMembership(db, userId, organizationId)` is the one place that answers "can this user touch this workspace's data" — a direct `member` table lookup, never a trust of a client-supplied id. Every challenge/submission query is additionally scoped by `organizationId` directly in its `WHERE` clause (see `lib/challenge.ts`), not only at the page-navigation layer.

## 4. Facebook Login and Instagram Login connections

`lib/db/schema/meta-connection.ts`'s `meta_connection` table: one row per `(organizationId, provider)`, unique-indexed, provider ∈ `{facebook_login, instagram_login}`. Reconnecting the same provider updates the existing row in place (`lib/meta-connection.ts`'s `upsertMetaConnection`, an `INSERT ... ON CONFLICT DO UPDATE`).

**These are two separate, non-interchangeable ID/token namespaces for the same underlying Instagram account** — discovered the hard way in the original spike (`SPIKE-RESULTS.md` §3.1) and still true:
- `facebook_login`: token scoped to `graph.facebook.com`. **This is the one the entire challenge/discovery/processing pipeline uses** — `lib/sync.ts` looks it up by `(challenge.organizationId, "facebook_login")` and fails cleanly (`not_connected`) if it's missing or not `status: "connected"`.
- `instagram_login`: token scoped to `graph.instagram.com`. Connected and functional (OAuth flow at `app/api/auth/instagram/*`) but **not used anywhere in the Slice B pipeline** — kept only as the "Advanced: Instagram Login (development)" option on the dashboard.

Tokens are AES-256-GCM encrypted at rest (`lib/token-crypto.ts`, key from `TOKEN_ENCRYPTION_KEY`) — never stored or logged in plaintext. `metaConnection.status` ∈ `{connected, expired, error, disconnected}`; `lib/sync.ts` sets it to `expired` on a `token_invalid` Meta error and `error` on a `permissions` error, never on a rate limit (see §9).

**Currently live in Neon** (confirmed 2026-10-27): both connections exist for one workspace — `facebook_login` → `@the_calligrail` (`igUserId 17841457665709817`), `instagram_login` → `@cc_spike_participant` (`igUserId 29747851788151290`). Both `status: connected`.

## 5. Database schema and migration history through 0005

Five new tables, all additive (no Slice A table touched), applied to Neon in order:

| Migration | Adds |
|---|---|
| `0003_challenges_and_submissions` | `challenge`, `submission`, `sync_run`, `sync_lease`, `processing_budget` — the full Phase 1 schema, 4 enums |
| `0004_discovery_cursor` | `challenge.discoveryCursor`, `challenge.discoverySweepCompletedAt` |
| `0005_retry_not_before` | `submission.retryNotBeforeAt` |

Confirmed on Neon right now: migration history has exactly 6 rows (`0000`–`0005`), `drizzle-kit generate` reports no pending diff, and the `challenge`/`meta_connection` tables' pre-existing rows are untouched by any of this.

**`challenge`** (`lib/db/schema/challenge.ts`) — id, organizationId FK, name, normalized `hashtag` (no `#`), cached `hashtagId` (resolved once, never re-resolved — Meta's ~30-unique-hashtags/IG-user/7-days quota), `requiredMention` (username snapshot at creation), date-only `startDate`/`endDate`, IANA `timezone`, persisted `status` (`draft|active` only — `ended` is *always* derived, never stored, via `lib/timezone.ts`'s `deriveChallengeStatus`), `dailyProcessingCapacity` (nullable int, `null` = unlimited, no UI yet), `processingGracePeriodHours` (default **3**), `discoveryCursor`/`discoverySweepCompletedAt` (§8).

**`submission`** — id, challengeId FK, mediaId, permalink, caption, `creatorUsername` (null until verified — `recent_media` can't return it), `mediaType`/`mediaUrl`/`thumbnailUrl` (best-effort, now partially confirmed working — §10), raw `publishedAt`, derived `challengeLocalDay` (date-only, the challenge-timezone calendar day `publishedAt` falls on — set once, immutable), permanent random `allocationRank` (DB `random()` default, never recalculated), `processingStatus` ∈ **`pending | completed | error_permanent`** (deliberately *no* stored `error_retryable` — see §9), `mentionResult` ∈ `{verified, not_verified}` (only meaningful once `completed`), `processingCheckedAt`, `lastAttemptedAt`, `retryNotBeforeAt`, `retryCount`, `dateEligible` (pure date math, independent of processing — recomputed idempotently every discovery upsert), `reviewStatus` ∈ `{unreviewed, selected, rejected}` (**sync upserts must never touch this column** — enforced by code convention, not a DB trigger). Unique index on `(challengeId, mediaId)` — the DB-level dedup guarantee everything else relies on.

**`processing_budget`** — one row per `(challengeId, challengeLocalDay)`, unique-indexed. `capacity` (nullable snapshot, not a live lookup), `consumed`. Nonnegative `CHECK` constraints on both. This is the "processing capacity, not gallery visibility" accounting — see `docs/DECISIONS.md`.

**`sync_run`** — one row per sync invocation; doubles as "last sync" status for the UI. `cursor` is diagnostic-only (mirrors `challenge.discoveryCursor`, never itself a resume source).

**`sync_lease`** — one row per challenge, the atomic concurrency lock (`lib/sync-lease.ts`), same `INSERT ... ON CONFLICT DO UPDATE ... WHERE expired` pattern as `lib/rate-limit.ts`'s `rate_limit_bucket`.

## 6. Challenge management

`lib/challenge.ts`: `createChallenge`/`updateChallenge`/`listChallenges`/`getChallenge`, all workspace-scoped by `organizationId` directly in the query (caller's job to have already verified membership). Hashtag is **immutable after creation** — a deliberate scope-limiting decision (changing it mid-challenge would orphan the cached `hashtagId` and already-discovered submissions). `getChallenge` returns `null` identically for "doesn't exist" and "belongs to another workspace" — never leaks which.

UI: `app/dashboard/challenges/page.tsx` (list), `.../new/page.tsx` (create — auto-detects the browser's IANA timezone client-side, post-mount only, to avoid an SSR/TZ=UTC hydration mismatch), `.../[id]/page.tsx` (detail/edit + the discovery/processing stats panel + `Sync now` button). `app/dashboard/challenges/ChallengeForm.tsx` is shared between create/edit modes.

## 7. Discovery, processing, and synchronization

One organizer-facing action, `Sync now` (`SyncButton.tsx` → `POST /api/challenges/[id]/sync` → `lib/sync.ts`'s `runSync`), internally doing three independently-resumable things in sequence, all under one `sync_lease` and one ~4-minute time budget (`SYNC_TIME_BUDGET_MS`, leaving margin inside Vercel's ~300s ceiling):

1. **Discovery** (`lib/discovery.ts`) — finds new candidates, writes `submission` rows. Never touches `processingStatus`/`reviewStatus` on an existing row.
2. **Processing** (`lib/processing.ts`) — allocates budget and calls Meta's mention-verification endpoint for backlog candidates.
3. **Finalization** — one `sync_run` row updated with final counts/status, lease released (`finally` block — released even on a thrown fatal error).

`runSync` returns a typed `SyncOutcome`: `synced` (with a `status` of `completed|partial|error`, a `summary`, and an optional `rateLimitedUntil`), `already_running`, `not_found`, `not_connected`, `reconnect_required`, or `permissions_required` — the API route (`app/api/challenges/[id]/sync/route.ts`) maps each to an HTTP status and a human-readable message.

## 8. Cursor persistence and recovery

Every sync runs a fixed **refresh phase** (always fetches `recent_media` page 1, unconditionally) followed by a **continue phase** that goes deeper:

- If `challenge.discoveryCursor` is set → resume the in-progress sweep from there.
- Else if `discoverySweepCompletedAt` is `null` (never swept, or a sweep was just reset) → start a new deep sweep from the refresh phase's *own* `after` cursor (no wasted duplicate page-1 call).
- Else if the last sweep completed more than `DEEP_SWEEP_INTERVAL_HOURS` (24h, internal constant, no UI) ago → same as above, and `discoverySweepCompletedAt` is cleared to `null` *immediately* so an interrupted new sweep never looks falsely "completed."
- Else → continue phase is a no-op this run (swept recently, not due).

Recovery: a budget-exhausted mid-sweep (ran out of this run's page/time budget, not an error) saves the current cursor for next time. A `cursor_invalid` Meta error clears both fields — the *next* sync falls into the "never swept" branch and safely restarts from page 1 (cheap, since the unique index makes re-scanning overlapping pages a no-op). Token/permission errors propagate as fatal and stop the whole sync (§9). `rate_limited` during discovery is handled like processing's connection-wide case (§9) — stops this run's continue phase, surfaces `rateLimitedUntil`, touches nothing persistent beyond that.

## 9. Processing quotas, allocation, retries, and rate limits

**Allocation** (`runProcessing`): iterates challenge-local days whose grace period (`processingGracePeriodHours`, default 3h after that day's end-of-day in the challenge's timezone) has elapsed, **most-recent-eligible-day first** ("prioritize yesterday's submissions today"), spending each day's remaining budget on its `pending` backlog ordered by the permanent `allocationRank` ascending — never by publish time or discovery/API order.

**Budget** (`processing_budget`): `NULL` capacity = unlimited (pilot default). Charging is atomic and exactly-once: one DB transaction does a conditional `UPDATE processing_budget SET consumed = consumed + 1 WHERE ... AND (capacity IS NULL OR consumed < capacity)`, and only if that matched, `UPDATE submission SET processing_status = 'completed' ... WHERE id = ? AND processing_status = 'pending'` — either guard failing rolls back the whole transaction, so a submission can never be charged twice and a day can never exceed its capacity. **Only a successful evaluation (`completed`) consumes a unit — `error_permanent` (a technical failure) never does.**

**Retry/error states** — `processingStatus` has exactly 3 values, no stored "retryable" state:
- A transient per-submission failure leaves the row `pending`, incrementing `retryCount`/setting `lastAttemptedAt` — the *same* `WHERE processing_status = 'pending'` backlog query naturally re-selects it once backoff elapses, no special-casing needed.
- Backoff is exponential by `retryCount` (1/2/4/8/16 minutes), **overridden to the *later* of that generic deadline and Meta's `Retry-After`** when a failure carries one (`submission.retryNotBeforeAt`) — Meta's signal can only extend the wait, never shorten it below the generic floor.
- After `MAX_RETRY_ATTEMPTS` (5) failures, promoted to `error_permanent` — no budget charge, terminal.
- Genuinely inaccessible/deleted media → `error_permanent` immediately, no retry wait needed (already known permanent).

**Rate limiting is connection-wide, deliberately separated from per-submission failures**: a `rate_limited` Meta response stops the *entire* processing phase for this run immediately — never touches the triggering candidate's `retryCount`/`lastAttemptedAt`/`retryNotBeforeAt` at all (it's exactly as eligible next time as before the attempt), and never marks the connection broken. It surfaces as `rateLimitedUntil` on the sync's result (`Retry-After` if Meta sent one, else a documented 60s guess) — a clean, actionable `synced`/`partial` outcome, not an exception.

**Token/permission errors are fatal to the whole sync**, by contrast: `token_invalid` → `metaConnection.status = 'expired'`, outcome `reconnect_required`. `permissions` → `status = 'error'`, outcome `permissions_required`. Neither increments any submission's `retryCount`.

## 10. Meta API findings from the successful live experiment (2026-10-27)

Live test against the real `@the_calligrail` `facebook_login` connection, hashtag `#grafeattest2026`, two real public Personal-account posts. Full detail in `docs/meta-api-experiments.md` Experiment 11 — summary:

- **Hashtag discovery works** for this connected organizer: `ig_hashtag_search` resolved cleanly, `recent_media` found both test posts on the first page, nothing else.
- **`mentioned_media` correctly verifies a genuine mention** — the mentioning post resolved to `verified`, with `username`, `caption`, `media_type`, `media_url`, `permalink` all populated.
- **A real, confirmed bug found and fixed**: the hashtag-only (non-mentioning) post did *not* come back as a clean 200 — Meta returns **HTTP 400, `code: 10`, `OAuthException`, message `"(#10) User is not mentioned in the caption."`** for an entirely ordinary non-match. `lib/meta-graph.ts`'s classifier originally mapped this to a `permissions` error, which would have made the real engine treat *every single non-matching hashtag post* as a connection-breaking failure in production. Fixed: this exact message pattern is now a dedicated `not_mentioned` classification, checked before the generic permissions bucket, translated back into a normal `{outcome: "not_mentioned"}` return inside `fetchMentionedMedia` — never surfaced to `lib/processing.ts` as an error at all. Regression tests added (`tests/meta-graph.test.ts`) reproducing the exact observed response.
- **A verified submission's `media_url` is a real, loadable image** — confirmed with an actual `HEAD` request: HTTP 200, `content-type: image/jpeg`, `content-length: 12831`. `thumbnail_url` was `null` for this `IMAGE`-type post (untested for video).
- **Two scope limits on what this proves, explicitly not resolved by this test:**
  - **External-organizer Advanced Access is still unverified.** This used the same single development connection used throughout. Whether Meta has formally granted Advanced Access for arbitrary external Grafeat organizers in production remains unconfirmed — the original spike recorded an explicit rejection of `ig_hashtag_search` pending "Instagram Public Content Access" review (`SPIKE-RESULTS.md` §3.2 Test E); this run didn't hit that gate, but that doesn't prove it's resolved for other organizers. Confirm directly in the Meta App Dashboard before relying on this for a different organizer.
  - **The mentioning test participant, `cc_spike_participant`, is the same account already connected to this app via Instagram Login** from earlier spike work — not a fully arms-length, never-before-seen account. This doesn't invalidate the technical findings, but it means "works for a genuinely unrelated participant" is still not independently established.
  - **Meta CDN `media_url` values are signed/expiring URLs** (visible query params: `oe=`, `oh=`, `_nc_*`) — must never be treated as permanent; any gallery implementation needs to re-fetch or cache, not store the URL long-term as if static.

## 11. Current UI and API routes

- `GET /dashboard` — connection status + challenge summary (existing, extended).
- `GET /dashboard/challenges`, `/new`, `/[id]` — list/create/detail+edit+sync.
- `POST /api/challenges` — create (`lib/challenge.ts`).
- `POST /api/challenges/[id]` — update.
- `POST /api/challenges/[id]/sync` — the `Sync now` action (`lib/sync.ts`).

No gallery route exists yet. No review/select/reject route exists yet (schema supports it — `submission.reviewStatus` — but no API/UI touches it).

## 12. Tests and verification commands

```
npx tsc --noEmit        # clean
npx vitest run --no-file-parallelism   # 146/146 passing
npx drizzle-kit generate                # "No schema changes, nothing to migrate" confirms no drift
```
`--no-file-parallelism` avoids PGlite resource-contention flakiness observed under this machine's default parallel test-file execution — a known environment quirk, not a test defect (confirmed by rerunning the single flaky file in isolation, which always passes).

15 test files, including `tests/discovery.test.ts`, `tests/processing.test.ts`, `tests/sync.test.ts`, `tests/sync-lease.test.ts`, `tests/meta-graph.test.ts` (error classification, including the live-confirmed `not_mentioned` regression), `tests/timezone.test.ts` (including DST-boundary and grace-period math). All Meta API calls in tests go through an injectable `MetaGraphClient` fake (`tests/fake-meta-graph.ts`) — no network access, no live-API dependency, consistent with the original spike brief's "mock Meta API responses for automated tests; do not make live Meta API requests in CI."

## 13. Deployment status

**Not deployed to Vercel for this slice.** All work so far has run against the real Neon database directly from a local environment, migrations applied via a one-off script using `drizzle-orm`'s programmatic `migrate()` (the `drizzle-kit migrate` CLI silently fails in this environment — a known, worked-around quirk, not a schema problem). No Vercel deploy has been triggered as part of Slice B.

## 14. Known limitations and unresolved issues

- **External-organizer Advanced Access** — unresolved, see §10. The single biggest open risk before onboarding any organizer other than `@the_calligrail`.
- **Error classification beyond `not_mentioned`/`token_invalid`/`rate_limited` is still largely unverified against real responses** — genuinely deleted/inaccessible media, a real expired/invalid pagination cursor, and a real permissions-scope error have not been observed live. The classifier's fallback for unrecognized shapes is deliberately `transient` (retry-and-see) rather than `permanent`, to avoid wrongly giving up on a candidate forever — but this means a genuinely new error shape will retry up to 5 times before anyone notices it's not actually transient.
- **No gallery, no review/select/reject UI** — schema-ready, not built.
- **No likes/comments/carousel/billing** — deliberately out of scope for Slice B (see `docs/DECISIONS.md`).
- **`dailyProcessingCapacity`/`processingGracePeriodHours` have no UI** — configurable only via direct DB access. Fine for the pilot; a real product needs organizer-facing settings eventually.
- **Single-workspace-per-user model** (Slice A's `membershipLimit: 1`) — unaffected by Slice B, but worth remembering when `docs/DECISIONS.md`'s future org-level entitlements eventually need implementing.

## 15. Exact next implementation steps for the Slice B gallery

Per the explicit gate maintained throughout this project: the gallery was blocked on the media-availability experiment, which has now **succeeded** for the connected organizer (§10). The next steps, in order:

1. **Review/select/reject API route** — a `POST /api/challenges/[id]/submissions/[submissionId]/review` (or similar) setting `submission.reviewStatus`, workspace-scoped via `getChallenge` the same way `sync` is, with the same "never let sync touch this column" invariant already enforced on the write side.
2. **Gallery query** — likely a new `lib/submission-gallery.ts` returning `submission` rows where `processingStatus = 'completed' AND mentionResult = 'verified' AND dateEligible = true` for a challenge, ordered sensibly (e.g. `publishedAt` desc) — paginated if volume warrants it; not needed yet at pilot scale.
3. **Gallery UI** on the challenge detail page — image grid using `mediaUrl` (remembering it's a signed/expiring Meta CDN URL — §10's last caveat — so either render it directly and accept it'll eventually 404 for old entries, or add a lightweight re-fetch-on-view/cache layer; recommend starting with direct rendering for the pilot and only building caching if it proves necessary), select/reject controls, persistent filters (unprocessed/verified/ineligible/selected/rejected — §9's states are all already distinguishable).
4. **Diagnostics view for non-gallery states** — per `docs/DECISIONS.md`'s "review is independent of eligibility/processing" decision: unprocessed, pending/error, and ineligible submissions should be inspectable somewhere without being presented as gallery-ready.
5. Continue treating `external-organizer Advanced Access` (§10/§14) as an open risk to flag, not something the gallery implementation itself needs to resolve — it only matters once a second organizer is onboarded.

No code for any of this exists yet as of this handover.
