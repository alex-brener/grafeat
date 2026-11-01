# Grafeat UX-A — Targeted Architecture Revision: Daily Curation & Stable Random Sampling

## Context and objective

We have already completed the broad UX-A investigation and approved the **landing-page interactive demo as the production UX/UI specification**. The existing UX-A technical plan is broadly accepted. **Do not repeat the demo-vs-dashboard audit or redesign the interface.**

Your task is to **revise the existing UX-A implementation plan** to incorporate the final product decisions below, inspect the actual repository and current sync/data model, and return an implementation-ready delta with a recommendation. **Planning only: no code or configuration changes.**

Read the existing UX-A plan, relevant `docs/HANDOVER.md` / `docs/DECISIONS.md`, challenge/submission schema, synchronization/allocation logic, gallery and diagnostics queries, review mutation and API routes, challenge settings/form, and the landing-page curator demo. Treat existing implementation and documented decisions as evidence; identify any contradictions explicitly.

## Locked product decisions

### 1. Daily curation scope

- A challenge contains multiple **publication days**, determined by the challenge's configured IANA timezone.
- Each publication day has its **own Ready gallery, Set aside view, review/selection context, complete selected-items tray, and future carousel**.
- The organizer may curate yesterday's submissions today; the curation date is not necessarily the publication date.
- Switching days restores that day's persisted selection and review state. Day navigation must work across refreshes and pagination.
- Keep the distinction between **challenge-local publication day**, discovery/processing time, and eventual carousel publication time explicit.
- Inspect whether existing `challengeLocalDay` accurately represents the publication day for all relevant records; do not assume a processing-bucket field is automatically suitable as a UX filter.

### 2. Stable, fair daily review pool

- Organizers should not be forced to manually review every eligible post in high-volume challenges.
- For each challenge day, choose a **random subset of eligible submissions**, up to a configurable daily review limit.
- The sample must be **stable across reloads, pagination, and subsequent syncs**: never use an unstable `ORDER BY RANDOM()` at read time.
- Do not favor earliest posts or particular time zones by default.
- Existing presented submissions and organizer selections must not disappear unexpectedly when new posts arrive.
- No Reshuffle control in UX-A.
- Define an explicit, deterministic policy for new eligible posts arriving before and after the review pool reaches capacity. Evaluate fairness implications of any first-fill approach and whether selection should wait for the daily eligibility window/grace period to close. Explain tradeoffs; don't silently equate "stable" with "fair".
- A challenge's **daily review limit is configured once in challenge Settings**, applied across all its days. No day-specific override in UX-A. Specify proposed defaults, allowed range, and what happens if the limit changes after a day's pool is established; mark choices needing product approval.

### 3. Transparent counts and eligibility

Distinguish and display accurate counts for each day, including:
- **Discovered:** hashtag matches discovered for that publication day.
- **Processed/verified:** posts actually evaluated (if needed to interpret eligibility).
- **Eligible:** posts confirmed to satisfy the implemented rules.
- **Displayed for review:** eligible posts admitted to that day's stable review pool.
- **Selected:** submissions selected by the organizer from that day.

Do not label unprocessed posts as ineligible or imply the eligible count is complete when a backlog or API coverage gap exists. Define honest UI wording for partial syncs, rate limits, and ongoing collection. Keep automatic exclusion distinct from random non-inclusion in the review pool; these are not the same thing and should not be mixed into Set aside without a clear product rationale.

### 4. Selection tray and demo fidelity

- The tray shows **every selected submission in the active publication day's review pool**, independently of gallery pagination and current tab/filter.
- Selecting/deselecting from gallery, tray, or shared lightbox updates the same persisted review state and optimistic UI; rollback on failure.
- Never silently truncate tray data. If capacity or query limits are needed, expose and handle them explicitly.
- Keep the demo's View button and shared full-image lightbox for gallery and tray items; viewing never toggles selection.
- Keep Settings in the top-right link, Curate → Compose → Publish navigation (future steps disabled), Ready / Set aside, complete uncropped artwork (`object-fit: contain`), and demo-consistent visual treatment.
- Rejected eligible submissions belong in Set aside, separately identified from automatic rule failures; Undo must work.
- Carousel ordering and publishing remain Slice C; no new ordering model in UX-A unless genuinely required by the daily pool architecture.

### 5. Scope boundary

- **Daily review limit is not necessarily the same as the existing daily processing capacity.** Inspect and distinguish discovery, processing/verification allocation, and display sampling before proposing reuse.
- Preserve existing Meta API behavior, rate-limit handling, cursor semantics, processing grace period, workspace authorization, and tested Slice B behavior.
- Do not add background auto-sync now. It is a confirmed future requirement, but the UI must not claim periodic checks currently exist.
- Do not implement Challenge Duplicate, Compose, Publish, caption templates, or other future features.

## Specific architecture questions to resolve

1. **Day identity:** What exact field and timezone conversion should identify the publication day? How are dates stored, filtered, indexed, and passed through routes? What happens at midnight and DST boundaries?
2. **Review state:** Can existing per-submission `reviewStatus` remain unchanged with day-scoped queries? Are there cases where a submission can be associated with multiple days, or a day assignment can change on re-sync?
3. **Sampling persistence:** Compare viable approaches (persisted membership, deterministic seeded ranking, existing allocation fields, or other minimal alternatives). Evaluate stability, fairness, pagination, late arrivals, removals, and migration needs. Recommend one, with explicit invariants.
4. **Sampling timing:** Is a full-day random draw after the processing grace period feasible? If users curate earlier, how do we preserve both stability and meaningful randomness? Make a concrete recommendation rather than hand-waving.
5. **Limit changes:** What happens when an organizer increases or decreases the challenge-level daily review limit after a pool has been created or selections made? Never silently discard selections.
6. **API/data:** Specify exact changes to gallery, diagnostics, selected-items query, daily counts, review mutation, challenge settings, and day navigation. Show how pagination remains deterministic and how the full tray is fetched securely without hidden truncation.
7. **Scalability:** Consider hundreds/thousands of discovered submissions, Meta verification costs, Neon query patterns, and how sampling affects processing capacity. Don't claim a count of all eligible posts unless they were actually checked.
8. **Security & regressions:** Maintain organization/workspace scoping on all new routes and queries; outline tests for cross-tenant isolation, day isolation, stable sample, late arrivals, sync reruns, reject/undo, optimistic rollback, and cross-page tray consistency.

## Required deliverables

Return a **targeted revision** of the existing UX-A plan, not a fresh broad report:

1. **Findings from the current code:** Exact relevant schema, queries, sync behavior, and constraints; clearly separate confirmed facts from assumptions.
2. **Recommended architecture:** Day scoping, sampling/persistence algorithm, timing, and limit semantics. Include a concise data-flow diagram or sequence in Markdown.
3. **Data model / migration decision:** Every proposed column/table/index or explanation for avoiding changes, with rationale.
4. **Endpoint and component delta:** Specific files/functions/routes to modify or add; how they integrate with the existing `CurationWorkspace`, selected tray, Ready / Set aside, Settings, and lightbox plan.
5. **Revised implementation sequence:** Small testable steps, dependencies, acceptance criteria, and QA checklist. Keep demo fidelity as the objective, not an excuse to rework unrelated code.
6. **Tradeoffs and open approvals:** Surface only genuine product choices not already locked. In particular, recommend default/min/max review limit, sampling cutoff/late-arrival policy, and behavior when a limit changes.
7. **Deployment/migration risks:** Especially any impact on existing real QA submissions and already-validated Slice B behavior.

## Execution constraints

**Read-only investigation and planning.** Do not implement, edit files, alter `.env` or Vercel settings, apply migrations, run live syncs, change Meta permissions, commit, push, or deploy. Do not print secrets or raw Meta access tokens. Wait for approval after delivering the revised plan.

Provide the final plan in Markdown, suitable for saving under `docs/` once approved.
