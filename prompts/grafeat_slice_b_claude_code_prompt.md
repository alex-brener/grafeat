# Grafeat — Slice B Implementation Brief

## Mission
Build the first genuinely useful organizer workflow: **create a challenge → discover public Instagram submissions → verify organizer mentions → review and select works**. Work within the existing Grafeat repository and preserve the functioning Slice A/A.1 authentication, workspace, Meta OAuth, and landing-page signup flows.

**First response required:** inspect the repository and existing documentation (`HANDOVER.md`, `docs/meta-api-experiments.md`, current schema/migrations, OAuth callbacks, token crypto, dashboard, tests). Report an implementation plan, API feasibility/permissions checks, proposed schema, route/UI structure, risks, and explicit manual prerequisites **before modifying code or applying migrations**. Do not ask me to repeat facts already documented in the repository. After I approve the plan, implement in small, verifiable increments.

## Context / validated findings
- Stack: Next.js 15, React, TypeScript, Neon PostgreSQL, Drizzle ORM, Better Auth with organization/workspace model; encrypted Meta tokens stored in `meta_connection` per organization/provider. Vitest/PGlite tests already exist.
- Organizer is a professional Instagram account connected through **Facebook Login** (and a Facebook Page). Instagram Login exists as a separate, advanced connection; **do not substitute its token** for the Facebook Login token used in the validated discovery path.
- Local test organizer: `@the_calligrail`. The Facebook Login OAuth connection has succeeded; username persistence added in migration `0002_meta_connection_username.sql`. Two fresh public Personal Instagram accounts can act as participant test accounts.
- Previously verified Meta Graph API patterns (recheck actual code and `docs/meta-api-experiments.md` rather than guessing):
  1. Resolve hashtag ID: `GET /ig_hashtag_search?user_id={organizer_ig_id}&q={hashtag}`.
  2. Scan media: `GET /{hashtag_id}/recent_media?user_id={organizer_ig_id}&fields=id,caption,permalink,timestamp&limit=50`, paginate with `paging.cursors.after`.
  3. Verify real @mention: `GET /{organizer_ig_id}?fields=mentioned_media.media_id({candidate_media_id}){id,username,caption}`.
- Previous experiment paginated through 400 items across eight pages and found public Personal-account submissions. API completeness/ordering is **not guaranteed**; never promise exhaustive hashtag coverage. An @mention string in the caption is **not** proof of a verified mention.
- Instagram Public Content Access (IPCA) / appropriate Meta Advanced Access may still be pending for external organizers. A successful OAuth connection with a developer/test account does not establish general external-user eligibility. Surface permission/API failures clearly and keep this launch dependency visible.
- Hashtag search quota is approximately **30 unique hashtag lookups per IG user per rolling seven days**: resolve once per challenge and cache the hashtag ID. Verify exact current limits against existing experiment notes.
- Vercel **Hobby**: prioritize organizer-triggered **Sync now**. Do not depend on frequent Cron, webhooks, paid infrastructure, or a continuously running worker. Any optional daily cron is a later enhancement.
- Keep existing landing-page demo and marketing UI intact.

## Functional scope

### A. Challenge configuration
- Authenticated organizer can create, list, view, and minimally edit challenges inside their active workspace.
- Fields: challenge name; normalized hashtag (accept input with/without `#`); start/end date (and document timezone/UTC interpretation); required organizer @mention, preferably derived from the connected Instagram username rather than free text; status (draft/active/ended or a similarly simple, explicit model).
- Validate input server-side and clearly explain prerequisite: a valid Facebook Login Meta connection with eligible Instagram Professional account.
- Each challenge belongs to an organization. Every read/write must enforce current Better Auth session + membership + organization ownership. Do not trust organization IDs from client input.
- A single organization may have multiple challenges; do not assume one challenge per user. No multi-member collaboration UI yet.
- Cache resolved Meta hashtag ID per challenge. Avoid unnecessary repeated resolution.

### B. Submission discovery and sync
- Organizer can trigger **Sync now** from the challenge page.
- Use only server-side Graph API calls and encrypted, workspace-scoped Facebook Login credentials; never expose access tokens in the browser, logs, or responses.
- Resolve hashtag once if needed, paginate `recent_media` using `paging.cursors.after`, and save candidates idempotently. Do not assume chronological completeness, ordering, or universal discovery of all eligible posts.
- Bound work by a clear maximum page count/item count and execution-time budget appropriate to Vercel Hobby. Design sync as resumable batches with saved cursor/progress and explicit completion/partial/error states. Avoid an unbounded request that times out. If a full scan cannot finish in one invocation, provide an intuitive **Continue sync** action or safe equivalent.
- Prevent concurrent syncs for the same challenge with an **atomic DB lease/lock** that expires after crashes/timeouts. Ensure retry and reconnection behavior is safe.
- Deduplicate by Meta media ID within the appropriate ownership scope using DB uniqueness constraints, not application checks alone.
- Persist enough metadata for the gallery: media ID, permalink, caption, published timestamp, creator username when actually available, and media thumbnail/media URL only when permitted and available. Do not invent unavailable fields; respect Meta data retention/permissions and expiry of media URLs.
- Provide useful progress/status: items scanned, new candidates, existing candidates, verified/unverified/error counts, last sync, next continuation available, and actionable Meta errors (expired token, missing permissions, rate limits).
- Use resilient API calls: timeouts, bounded retries/backoff for transient errors, no retry storm for permission errors. Be mindful of quotas.

### C. Genuine mention verification and eligibility
- Verify each discovered candidate's mention of the organizer using the validated `mentioned_media.media_id(...)` API path. **Do not use caption text matching as the verification authority.**
- Track mention verification separately from challenge eligibility and organizer selection:
  - Mention verification: `pending | verified | not_verified | error` (or equivalent with explicit semantics).
  - Date/other eligibility: separately computed/persisted as appropriate.
  - Curator selection: `unreviewed | selected | rejected` (or equivalent).
- A failed API call is `error`/retryable, **not** `not_verified`. Missing data must not be presented as a negative verdict.
- Respect date boundaries and any configured challenge rules; for the MVP do not pretend to automatically verify artistic/subjective rules.
- Verify in bounded batches; show partial results promptly. Design for safe retry of `pending`/`error` without duplicating submissions or overwriting manual curator decisions.

### D. Organizer review gallery
- Build a real authenticated challenge page with a clear list/grid of discovered candidates, pagination or incremental loading, and useful filters (mention status, eligibility, selection).
- Show thumbnails when available, otherwise a graceful placeholder and link to the original Instagram post. Show creator handle only if retrieved reliably, post date, caption excerpt, and verified/uncertain status.
- Allow selection/rejection (and undo/reset) of individual works. Persist decisions immediately in the workspace-scoped database; sync must never erase selections.
- Make it clear that selected works are **not yet a generated or published carousel**. Do not implement fake carousel/export/publishing features.
- Reuse Grafeat's current branding, design tokens, dashboard shell, responsive patterns, keyboard/focus states, and accessible controls. No wholesale redesign of landing page.

## Engineering and security constraints
- Preserve all Slice A/A.1 behavior, auth cookies, OAuth flows, existing Meta connections, and `early_access_signup` data. Additive migrations only; show migration SQL before running it against Neon.
- No cross-workspace data leakage. Check ownership on every route, including sync, progress, gallery, and selection updates. Cover with tests.
- Credentials: decrypt server-side only; never return raw access tokens. Avoid logging PII unnecessarily.
- Protect manual sync endpoints against abuse and concurrent calls. Design for retries and partial failures. Avoid depending on process-local memory for job state.
- Prefer the current stack and existing patterns; justify any new package, service, or infrastructure cost before introducing it.
- Keep user-facing terminology simple: **challenge**, **submissions**, **verified mention**, **selected**; avoid exposing Meta implementation jargon unless explaining an error.
- Treat Meta permissions as a hard prerequisite. If an endpoint is unavailable under current app access, **do not fake success**. Show a blocked state and report precisely what Meta permission/review step is needed.

## Testing and acceptance criteria
Add targeted Vitest/PGlite tests and mock Meta API responses. **Never call live Meta in CI.** At minimum:
1. Challenge creation and validation; organization ownership and cross-workspace isolation.
2. Hashtag normalization and cached hashtag-ID reuse.
3. Multi-page scan, cursor persistence, dedup across repeated syncs, bounded/resumable operation.
4. Atomic sync lease, concurrent requests, expired lease recovery.
5. Verified vs unverified vs API-error mention outcomes; retry handling.
6. Date eligibility and independent curator selection state; sync preserves manual decisions.
7. Token isolation and permission/rate-limit/error handling.
8. Route-level auth enforcement and malformed input handling.

Manual smoke test with `@the_calligrail`:
- Create a test challenge with a unique hashtag and date range.
- Publish public test submissions from Personal accounts: one with real @mention of organizer, one without; allow for Meta indexing delay.
- Trigger sync; confirm discovery and accurate mention outcomes, noting any API omissions.
- Select a submission; sync again; verify no duplicates and selection persists.
- Reload/re-login; verify data persists.
- Verify another organizer workspace cannot access the challenge or its submissions.

## Delivery process
**Phase 0 — Plan and gate:** Inspect actual repository, document verified API contracts and environment prerequisites, propose migrations/route structure/UI, and flag Meta permission blockers. **Stop for approval before coding or applying migrations.**

**Phase 1 — Data model and challenge CRUD:** Additive schema/migrations and authenticated workspace-scoped challenge pages. Show SQL before applying migrations.

**Phase 2 — Sync engine:** Cached hashtag resolution, bounded pagination, persisted cursor/progress, atomic lease, idempotent storage, robust errors.

**Phase 3 — Mention verification:** Bounded API verification with independent status and retry logic.

**Phase 4 — Gallery:** Filters, selection/rejection, responsive review experience, accurate empty/error/progress states.

After each phase, run TypeScript and relevant tests and report outcomes, files changed, any migration/permission blockers, and exact manual acceptance steps. Do not silently skip blocked functionality. Do not modify unrelated landing-page/demo functionality.

**Git/deployment:** Do not commit, push, or deploy without explicit approval. Avoid destructive Git operations and never print secrets. Keep the dev server healthy; do not run a production build against the same `.next` directory as an active `next dev` process (stop it or use an isolated build output).

## Definition of done
An authenticated Grafeat organizer with an eligible connected Professional Instagram account can configure a challenge, run a safe repeatable discovery scan, inspect actual candidate posts, distinguish **verified mention** from **not verified** and **verification error**, and persist selection decisions. No claims of exhaustive hashtag coverage or finished carousel publishing. All workspace boundaries enforced and core tests passing.
