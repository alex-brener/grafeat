# Grafeat UX-A — Final Architecture Update & Implementation Approval Gate

## Role and objective
You are Claude Code working in the Grafeat repository. Update the **existing UX-A technical implementation plan** to reflect the final product decisions below, validate their fit against actual code, and produce an implementation-ready sequence. **This is planning only. Do not modify application code, schema, migrations, environment, or Meta connections; do not run syncs; do not commit, push, or deploy.** Do not treat this as authorization to implement. Return the updated plan and any genuine blocking questions for approval.

## Existing context
- Grafeat curates recurring Instagram art challenges; the landing-page interactive curator demo (`app/landing/curator/*`) is the **binding UX/UI specification** for the organizer dashboard, not merely inspiration.
- Slice B already has challenge management, discovery, verification, day allocation, pagination, Select/Reject/Undo, diagnostics, and sync. Preserve existing working behavior and workspace authorization.
- The prior UX-A plan proposes `CurationWorkspace`, Ready / Set aside, 4:5 uncropped gallery, tap-to-select, a separate View lightbox, persistent selected tray, day switcher, top-right Settings, and Curate → Compose → Publish stepper (last two disabled until Slice C).
- The architecture revision found `submission.challengeLocalDay` (timezone-derived at discovery), persistent random `allocationRank`, grace period (default 3h), and `dailyProcessingCapacity` (nullable, default `null` = unlimited, currently not user-configurable). It proposed `sampledForReview` and `dailyReviewLimit` columns.
- Current `runProcessing` already **waits until publication day ends + grace period** before allocating candidates. Do not introduce a second conflicting timing model.

## FINAL LOCKED PRODUCT DECISIONS

### 1. Daily isolation
- A challenge has separate publication days. Each day has its own Ready / Set aside view, review decisions, selected tray, and future carousel.
- Day identity should reuse `challengeLocalDay` if repository verification still supports this.
- Default view should prioritize the latest completed/grace-elapsed challenge-local day, with navigation to other available days.
- A challenge's timezone must become immutable once submissions exist; show a clear validation error.
- A post belongs to exactly one challenge-local publication day. Curation date (when organizer works) is not the publication day.

### 2. Random, stable daily review pool
- **Only finalize/admit a day's review pool after that publication day ends AND its processing grace period has elapsed.** No early preview pool for the still-open day.
- Random sampling must not favor chronological posting. Reuse `allocationRank` where sound; **persist membership** (e.g., `sampledForReview`) so refresh, pagination, and later syncs do not reshuffle or silently displace already shown/selected items.
- Review admission must be idempotent and **concurrency-safe**. Explain the transaction/locking strategy for overlapping syncs and limit changes.
- Existing members are never silently removed. Increasing a limit may admit additional items at the next appropriate admission pass; decreasing a limit does not evict existing members, including selected items.
- Explain late discovery/verification after grace period: how new eligible posts are treated if there is remaining capacity, and how you avoid claiming the sample is perfectly uniform over undiscovered posts. Preserve stable membership.
- Do not implement `ORDER BY RANDOM()` on every gallery read, nor a live top-N query that can replace previously visible items.

### 3. Challenge-level review setting and transparent counts
- `dailyReviewLimit` is configured **once per challenge in Settings**, not per day.
- Allowed range: **minimum 50, default 200, maximum 500**. Validate server-side and in UI. A subscription's entitlement may later cap the configurable value, but **do not implement billing or plan enforcement now**.
- The daily tray includes **every selected item for the active day**, across pagination/filtering, without hidden truncation (no silent 500-item tray cap).
- Display truthful, separately labeled per-day statistics for **discovered, actually verified/processed, eligible, admitted/shown for review, and selected**. Do not label unprocessed posts as ineligible.
- Eligible but not sampled: show as a count/explanation only, **not an alternative browsable gallery**. Keep genuine automatically excluded and manually rejected items distinguishable in Set aside.
- A configured review limit is a maximum, not a guarantee that this many eligible items exist.

### 4. Processing capacity versus review capacity
- Confirm repository facts: `dailyProcessingCapacity` defaults to `null` (unlimited), has no current Settings UI, and is enforced in processing allocation only after the grace period.
- **Customer-facing pricing metric is eligible submissions available for daily review, not processed-submission count.** Processing capacity is an **internal operational safeguard**, not a second user-configurable quota.
- Investigate how bounded processing can eventually avoid verifying thousands of posts merely to display up to 500, while still obtaining enough eligible posts (processed != eligible) and retaining randomized allocation. Do not silently change the current pilot's unlimited processing semantics without an approved design.
- Explicitly separate what is required for UX-A now from a safe follow-up optimization for production scaling. If a bounded-processing change is necessary now, justify it and propose precise safeguards, tests, and an approval gate. Be honest that a sample drawn from verified posts cannot guarantee equal opportunity among never-discovered or never-processed posts.

### 5. Multi-challenge organizations and future pricing
- Product pricing has **two independent dimensions**: (a) per-challenge daily review capacity and (b) maximum concurrently active challenges per organization.
- Two simultaneous challenges count as **two active slots even if they use the same Instagram account**.
- Archived/inactive challenges do not consume active slots; historical challenge data remains accessible. Define a proposed future operational meaning of active versus archived, without prematurely implementing lifecycle/billing behavior.
- Organizations may manage multiple challenges and potentially multiple client Instagram accounts; preserve organization/workspace scoping and token isolation. Do not assume one challenge per organization or one Instagram authorization covers all accounts.
- **No subscription enforcement, agency-specific UI, or new billing system in UX-A.** Treat illustrative plan prices/tier counts as unapproved hypotheses, not requirements.

### 6. Previously approved UX-A behavior
- Faithfully adapt demo design: challenge cards and switcher, stepper (Curate active; Compose/Publish genuinely disabled), top-right Settings, Ready / Set aside tabs, 4:5 cards with `object-fit: contain`, tap-to-select and numbered badges, explicit separate Reject, and a **View** button that opens a full-artwork lightbox without changing selection.
- Selected-tray thumbnails open the **same lightbox**; tray reflects the full server-backed day-specific selection, across pages and after refresh/sync. Use shared optimistic mutation/rollback so gallery, tray, and lightbox stay consistent.
- Real verification checklist only; no invented rule or automatic-sync claims. Manual Sync now and truthful last-sync timestamp. Periodic automatic sync is a future requirement, not part of UX-A.
- Maintain keyboard accessibility, focus management, responsive layout, empty/loading/error states, and full-image visibility. Preserve existing real Slice B functionality.
- Duplicate challenge, actual carousel composition/publishing, auto-likes/comments, and advanced billing belong to later slices.

## Required output
1. **Change log**: exactly what changes from the previous UX-A architecture revision and why.
2. **Verified repository findings**: reference actual file/function/schema names for grace period, processing capacity, allocation rank, timezone, day filtering, review state, sync, auth, and challenge settings. Separate verified facts from proposals.
3. **Final data model**: minimal schema/migration, defaults/backfill behavior for existing real submissions, indexes/constraints if justified; no unnecessary columns.
4. **Algorithm**: precise per-day processing/admission timing, random selection, transaction/concurrency safety, late arrivals, idempotence, limit increases/decreases, and how existing data becomes visible after migration.
5. **Routes/query/component map**: day-scoped gallery, diagnostics, selected tray, counts, day switcher, Settings; organization authorization and client state synchronization.
6. **Phased implementation sequence** with exact tests/QA and rollback/deployment considerations. Flag any database migration or production deployment gate.
7. **UX-A vs later**: distinguish mandatory implementation from follow-up scaling/billing/automation work; avoid scope creep.
8. **Open blockers only**: ask only genuinely necessary questions; do not reopen locked decisions.

## Explicit constraints
- **Planning only. No edits, migrations, tests that mutate data, Meta calls/syncs, commits, pushes, or deployments.** Read-only inspection is permitted.
- Preserve existing security, auth, and API rate-limit behavior.
- Avoid fabricated statistics, silent data truncation, and false fairness guarantees.
- Remember that pushing `main` auto-deploys Vercel; approval to implement is separate from approval to push/deploy.
- Return a concise but implementation-ready final plan. Wait for explicit authorization before coding.
