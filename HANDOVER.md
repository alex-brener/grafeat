# Grafeat — Handover

> **Superseded for Slice B topics (challenges, discovery, processing, sync) as of 2026-10-27 by `docs/HANDOVER.md`.** This file predates the database/schema entirely and is explicitly stale for that area — kept here unmodified otherwise, for its still-accurate pre-Slice-B history. See `docs/HANDOVER.md` for the current state and `docs/DECISIONS.md` for the agreed product/architecture decisions.

---

## Marketing-site maintenance — signup email + footer copyright (2026-11-24)

UX-A curation work (below) is **paused**, not resumed in this pass. Branch `feature/ux-a-curation` unchanged otherwise. Prompt: `prompts/grafeat-signup-email-footer-claude.md`.

**Task B — dynamic footer copyright: done, code-complete.** New `app/landing/CopyrightYear.tsx` (client component, computes `new Date().getFullYear()` at render time, `suppressHydrationWarning` on that value — needed because the landing/legal pages are statically generated at build time, so a server-only year would freeze until the next deploy). `Footer.tsx`/`Footer.module.css` updated: existing row (logo, tagline, Privacy/Terms nav) untouched; a new second row holds `© {year} Brener Digital LLC`. Shared by `app/page.tsx` and `app/legal/LegalShell.tsx` (privacy/terms), so all three public pages got it from one change. Verified in both the production build's static HTML output and the dev server for `/`, `/privacy`, `/terms` — real current year (2026) renders correctly in all three. `tsc --noEmit` clean, 200/200 tests passing, `next build` clean.

**Task A — early-signup email notifications: investigated, not touched.** Full pipeline traced (`EarlyAccessSection.tsx` → `app/api/early-access/route.ts` → `lib/early-access-handler.ts` → `lib/early-access.ts` → `lib/email.ts`). No code defect found — this code hasn't changed in a month (predates all UX-A work), all 19 existing tests pass, and the pipeline already distinguishes record-persisted from notification-sent (`notificationStatus`: `pending`/`sent`/`failed`) with structured failure logging. Two explanations remain, neither confirmable from this repo: (1) a Vercel production env var (`RESEND_API_KEY`/`MAGIC_LINK_FROM_EMAIL`/`EARLY_ACCESS_NOTIFY_EMAIL`) or Resend-account/domain issue, or (2) a duplicate-email resubmission, which is *silent by design* (same success response, no second notification) and would fully explain the symptom if testing reused the same email. **Per the user's direction, no code or test changes were made for Task A this pass** — they'll test with a genuinely new email first, then check Vercel runtime logs and Resend activity if it still doesn't arrive, before deciding whether any code change is actually warranted.

**Changed files (Task B only):** `app/landing/CopyrightYear.tsx` (new), `app/landing/Footer.tsx`, `app/landing/Footer.module.css`. Nothing else touched — no UX-A files, no commit/push/deploy/env-var/migration actions taken.

---

## Most recent work — UX-A Visual Parity + Day Navigation (2026-11-01)

**Status: code-complete, `tsc`/tests/build all clean. No human browser QA has been performed — do not treat anything below as visually verified.** Prompt: `prompts/grafeat-ux-a-visual-parity-and-day-navigation-claude.md`.

**Repository state note (informational, not an action I took):** this work was done on local branch `feature/ux-a-curation`, which already contained one commit (`5639139`, "feat(grafeat): implement day-scoped curation workspace") when this pass began — created by your own git identity, not by me; I never ran `git commit` this session or any prior one. `main`/`origin/main` remain untouched at `6f9b7cc`, and `feature/ux-a-curation` has no upstream/remote tracking (confirmed via `git branch -vv` and `git fetch --dry-run`) — nothing has been pushed. My own changes from this pass are uncommitted working-tree changes on top of that branch, same as every prior UX-A pass — I have not committed them, per the standing boundary.

**No browser automation is available in this environment** (checked via tool search — no `mcp__Claude_Browser__*`/`mcp__claude-in-chrome__*` tools present). Everything below is a source-level claim (compiles, type-checks, matches the screenshot's markup/copy/structure as read), never a pixel-verified one.

### What changed, and why

**Demo → real-app reuse (the core ask: "reuse, don't re-approximate"):** six new shared, data-driven presentational components in `app/curator-shared/` — `CuratorChrome` (header shell), `CuratorStepper`, `CuratorGridCard`, `CuratorLightbox`, `CuratorTrayBar`, `CuratorChallengeCard`, plus `useWideBreakpoint`. Each is extracted from the matching landing-demo file (`CuratorHeader.tsx`, `TodayScreen.tsx`'s card/tray blocks, `DetailOverlay.tsx`, `ProjectsScreen.tsx`'s row), same markup/inline-styles, but taking plain props instead of the demo's `CuratorViewModel`. The demo's own files (`CuratorHeader.tsx`, `TodayScreen.tsx`, `DetailOverlay.tsx`, `ProjectsScreen.tsx`) were refactored to call these shared components internally — the demo now sources its markup from the same code the real app uses, not a parallel copy. `CurationWorkspace.tsx` and the Challenges list were rewritten to use the same shared components with real data.

**Two real bugs caught during self-review, fixed before considering this done:**
1. `DayPicker`'s month-boundary check compared a 10-char date string (`"2026-10-01"`) against a 7-char month string (`"2026-10"`) — in JS, a longer string that merely starts with a shorter one still compares greater, so this always evaluated true and would have let the picker navigate before the challenge's start month. Fixed to compare two "YYYY-MM" strings.
2. The tray bar's `wide` prop was hardcoded `true` instead of using the real responsive breakpoint — would have shown the thumbnail row on mobile regardless of viewport. Fixed by extracting `useWideBreakpoint` into a shared hook used by both `CuratorPageShell` (header) and `CurationWorkspace` (tray), so they can't disagree.

One more fix mid-build (not a bug, a design correction before it shipped): the tray bar's fixed-position background initially used a single `maxWidth`-constrained div for both background and content, which would have shown the page's cream background bleeding through on either side on a wide screen instead of a clean full-bleed bar. Fixed with a two-layer wrapper (full-bleed background, centered content) — same pattern the demo doesn't need (its frame already is the reference box) but the real app's `max-width`-capped `<main>` does.

### Day navigation (new functionality, not an extraction — the demo has no working picker behind its "Day N of M ▾" label)

- **Header day picker** (`app/dashboard/challenges/DayPicker.tsx`): a compact month-grid popover replacing the old in-page pill-row day switcher. Distinguishes four states per calendar day — available (has data), available-empty (grace elapsed, zero submissions), pending (grace period still open), future — using `lib/timezone.ts`'s `isGraceElapsed`/`toZonedDateString` directly (both pure `Intl`/`Date` functions with no server-only dependency, so safe to import into a client component) rather than reimplementing the logic. Keyboard/Escape/outside-click/focus-on-open supported. `listChallengeDays` only returns days with submissions, so days with zero submissions are computed client-side via the same pure function — the one deliberate exception to "never recalculate day logic in the browser," since it's calendar-day enumeration and grace math, not a submission's own day identity (which still comes only from `challengeLocalDay`, untouched).
- **Prev/next arrows** next to the "Day N" heading on Curate only, stepping through calendar days (not just days with data) via the same availability logic, correctly skipping pending/future days.
- **URL persistence:** `?day=YYYY-MM-DD` query param, read server-side in `page.tsx` (an explicit, well-formed value wins over the computed default) and written client-side via `router.replace(..., { scroll: false })` on every day switch — refresh, back/forward, and shared links all land on the right day.
- **Default-day behavior unchanged:** still the latest grace-elapsed day when no `?day=` is present — `pickDefaultDay` untouched.

### Two product decisions made during the mapping/audit step, with your sign-off

1. **Header/auth:** the demo's avatar is a static decorative circle with no sign-out concept. The real header's avatar is now `AvatarMenu` — click to reveal email + sign-out (reuses the existing `SignOutButton`). `DashboardShell` (generic logo+email+signout header, 880px-capped content) is replaced by a new `CuratorPageShell` for exactly three routes — the Challenges list, a challenge's Curate workspace, and its Settings page — since `DashboardShell`'s own 880px max-width was also too narrow for the demo's 1440px gallery / 1080px challenge-list layouts. `/dashboard` (home) and `/dashboard/challenges/new` are untouched, still on `DashboardShell`, out of this prompt's scope.
2. **Fabricated metrics on the Challenges list:** the screenshot shows "15 features published," a progress bar, and 4-tile artwork mosaics — none of which exist in the real system (no Compose/Publish, no "representative artwork" concept). Per your confirmed default: honest empty/neutral placeholders. The mosaic slot renders 4 muted squares (no invented thumbnails); `progress` is always `null` (no bar, ever) rather than showing an invented percentage; the card instead shows real `discovered`/`eligible`/`last-sync` counts, same data `app/dashboard/challenges/page.tsx` already had.

### Known, deliberate gaps — not fabricated, not silently dropped

- **No video/Reel badge.** The demo shows "▶ Reel 0:16" on video items; `WorkspaceItem` has no reliable duration field, only a raw `mediaType` string from Meta, so this was omitted rather than guessing a duration. `CuratorGridCard`/`CuratorLightbox` both support `isVideo`/`dur` props if this data becomes available later.
- **Lightbox media label is the raw Meta `mediaType` string** (e.g. `"IMAGE"`), not the demo's polished "Image"/"Reel 0:16" — truthful over polished, not fixed further given time.
- **The demo's own day label was deliberately left non-interactive** (static "Day 16 of 31" text, unchanged). Making it a real picker would need new state in the demo's 762-line `useChallengeCurator.ts` hook with no real day-to-day fixture variation to navigate between — judged a risky refactor for no real benefit, so skipped. Documented here rather than silently done.
- **Status badge:** the original implementation showed the challenge's draft/active/ended status prominently; the screenshot has no equivalent (demo challenges have no draft state). Caught during self-review as a real information-visibility regression, not just cosmetic — added back as a small badge next to the day eyebrow rather than left dropped.
- **Mobile:** `CuratorPageShell`'s `wide` state is `useState(true)` initially (client-measured, so the very first server-rendered paint always assumes desktop width until JS hydrates and the `resize`/measurement effect runs) — a brief flash on narrow viewports, not a crash or broken layout. Not fixed further given time; worth a look during manual mobile QA.
- **Compose CTA** in the tray bar renders genuinely disabled ("Compose", greyed, no arrow) — never a dead link, per the explicit instruction not to present unavailable stages as working.

### Verification performed

- `tsc --noEmit`: clean.
- Full test suite: **200/200 passing** (no `lib/` changes this pass — day-picker/grace-period logic reuses existing, already-tested `lib/timezone.ts` functions directly rather than adding new ones).
- Production build: ran cleanly (dev server on port 3002 stopped before the build, `.next` cleared, restarted fresh after — confirmed healthy, all touched routes 307-redirect to `/login` as expected rather than 500ing).
- Landing page (`/`) confirmed still 200 and rendering after every demo-file refactor.
- **What was NOT verified:** anything visual. No screenshot comparison, no click-through, no mobile-viewport check, no keyboard-navigation trace. The §8 QA checklist below is new and entirely unchecked.

### Human browser-QA checklist (new, unchecked — do not treat any item as passed)

- [ ] Challenges list and Curate page visually match the four supplied screenshots at a normal desktop width
- [ ] Header day picker opens/closes correctly, shows the four day-states distinguishably, keyboard-navigable, Escape closes it, doesn't trap focus
- [ ] Prev/next day arrows on Curate correctly skip pending/future days and land on the right available day
- [ ] `?day=` persists across refresh and responds correctly to browser back/forward
- [ ] Switching days updates gallery/counts/tabs/tray/lightbox atomically, no stale cross-day data, no leakage between days' selections
- [ ] Rapid day switching (click several days quickly) doesn't produce a race/flicker of stale data
- [ ] AvatarMenu opens/closes correctly (click, outside-click, Escape), sign-out still works
- [ ] Settings page reachable from the header, same shell, form still saves correctly (unchanged `ChallengeForm` logic)
- [ ] Mobile/narrow-viewport layout: header day-trigger/stepper correctly hide below 760px (matches the demo's own breakpoint), Curate's prev/next arrows and grid remain usable, no horizontal scroll/overflow
- [ ] Landing-page demo (`/`) — both embedded preview and full-screen mode — still renders and behaves exactly as before this refactor (Challenges/Curate/Settings screens, lightbox, tray, stepper)
- [ ] Lightbox keyboard nav (arrow keys, Escape) and the real eligibility checklist (mentionResult/dateEligible) display correctly for a genuine submission

---

## Current work in progress — UX-A (2026-10-31)

**Objective:** align the real organizer dashboard with the landing-page demo (`app/landing/curator/*`) and add daily-isolated curation with stable, capacity-bounded sampling. Full specification: **`docs/UX-A-IMPLEMENTATION.md`** (durable spec) — this section is the live operational status only; the spec doesn't change as work proceeds, this does.

**Baseline before this work started:** branch `main`, HEAD `6f9b7cc` ("Interface fixes"), working tree clean except untracked planning-prompt files, up to date with `origin/main` (confirmed via `git fetch`). `tsc --noEmit` clean, 173/173 tests passing.

**Authorization boundary for this work:** local implementation only. **Not** authorized: applying the migration to production/shared DB, committing, pushing (`main` auto-deploys Vercel), deploying, running a live Meta sync, changing Meta connections/env vars. See `docs/UX-A-IMPLEMENTATION.md` §7 for the phase plan.

**Phase status — all 5 implementation phases code-complete, verified by `tsc`/tests/build; interactive browser QA still pending (see below):**
- [x] Phase 1 — Schema + challenge validation
- [x] Phase 2 — Review-pool admission
- [x] Phase 3 — Day-scoped read APIs
- [x] Phase 4 — Curation workspace UI
- [x] Phase 5 — Demo-fidelity polish
- [x] Phase 6 — `tsc`, tests, production build (manual browser QA not done — no browser in this environment)

**Phase 1 — done (2026-10-31):**
- `lib/db/schema/challenge.ts`: added `dailyReviewLimit` (`integer`, `NOT NULL DEFAULT 200`, check constraint `BETWEEN 50 AND 500`).
- `lib/db/schema/submission.ts`: added `sampledForReview` (`boolean`, `NOT NULL DEFAULT false`, monotonic false→true only).
- `lib/challenge.ts`'s `updateChallenge`: added a timezone-lock guard (rejects a `timezone` change once the challenge has any submission row) and optional `dailyReviewLimit` validation (50–500; omitting it from the input leaves the existing value untouched, since the Settings UI doesn't expose a control for it yet — that's Phase 4/5).
- `app/api/challenges/[id]/route.ts`: `toInput` now passes through an optional `dailyReviewLimit` from the request body.
- Tests: 3 new cases added to `tests/challenge.test.ts` (dailyReviewLimit range rejection, timezone change allowed pre-submission, timezone change rejected post-submission).
- `tsc --noEmit` clean. Full suite: **176/176 passing** (up from the 173/173 baseline).

**Migration state:** generated locally only — `drizzle/0006_ux_a_review_sampling.sql`. **Not applied to any database**, including the local dev DB the running test suite doesn't touch (tests run against an in-memory PGlite instance that replays every migration file fresh each run). Applying this to the real dev/prod database is a separate action requiring explicit approval — see the migration SQL itself before approving:
```sql
ALTER TABLE "challenge" ADD COLUMN "daily_review_limit" integer DEFAULT 200 NOT NULL;
ALTER TABLE "submission" ADD COLUMN "sampled_for_review" boolean DEFAULT false NOT NULL;
ALTER TABLE "challenge" ADD CONSTRAINT "challenge_daily_review_limit_range" CHECK ("challenge"."daily_review_limit" BETWEEN 50 AND 500);
```
Both columns are additive with safe defaults — existing rows backfill automatically, no application code path depends on this migration having run yet (nothing reads `dailyReviewLimit`/`sampledForReview` outside tests until Phase 2).

**Phase 2 — done (2026-10-31):**
- New `lib/review-pool.ts`: `admitToReviewPool(db, challenge)` — for every grace-elapsed challenge-local day, admits up to `dailyReviewLimit - alreadySampled` eligible/verified/completed submissions, ordered by `allocationRank` ascending, via a single conditional `UPDATE ... WHERE sampled_for_review = false` per row (atomic by virtue of being one statement — no explicit transaction needed, unlike `completeSubmission`'s two-table charge).
- `lib/sync.ts`: calls `admitToReviewPool` right after `runProcessing`, inside the same try block (so it only runs on a sync that got past discovery/processing without throwing), before computing `status`/finalizing `sync_run`. Runs unconditionally even on a `partial` processing outcome.
- Tests: new `tests/review-pool.test.ts` (8 cases) covering grace-period gating, the completed+verified+dateEligible+not-yet-sampled filter, allocationRank-ordered cutoff at the limit, idempotent re-runs, later top-up without disturbing earlier admissions, decrease-never-evicts, and per-day isolation.
- `tsc --noEmit` clean. Full suite: **184/184 passing** (up from 176/176 after Phase 1).
- No new migration needed for this phase (uses the columns Phase 1 already added).

**Phase 3 — done (2026-10-31):**
- `lib/submission-gallery.ts`: `getGallerySubmissions`/`getDiagnosticSummary`/`getDiagnosticSubmissions` now require an explicit `day` (challenge-local, `YYYY-MM-DD`) and are fully day-isolated. `getGallerySubmissions` ("Ready" tab) now also excludes `reviewStatus='rejected'` — closing a real pre-existing gap — and requires `sampledForReview=true`. `DIAGNOSTIC_CATEGORIES` ("Set aside" tab) grew a 5th category, `"rejected"`, for manually-rejected eligible items (distinguishable from the 4 automatic exclusions, per locked decision #5).
- New functions: `getSelectedSubmissions` (tray — every selected item for the day, deliberately unpaginated, no truncation), `getDayStats` (discovered/completed/eligible/sampled/selected), `getNotYetSampledCount` (count only, never a browsable list — locked decision #4), `listChallengeDays` (powers the future day switcher, each day flagged `graceElapsed`), `resolveDay`/`pickDefaultDay` (shared "which day" logic: an explicit day is used as-is; omitted, resolves to the latest grace-elapsed day; `no_day_available` when none has cleared grace yet).
- `SubmissionCardData` gained `mentionResult`/`dateEligible` (closes another real gap — needed for Phase 4's lightbox checklist).
- Routes: `submissions`, `submissions/diagnostics`, `submissions/diagnostics/[category]` all take an optional `?day=` now (defaulting server-side via `resolveDay`). New routes: `submissions/selected` (tray), `submissions/stats` (day stats + not-yet-sampled count bundled together, to avoid a near-duplicate 5th route).
- `app/dashboard/challenges/[id]/page.tsx` updated to resolve a day before calling the now-day-scoped functions — still shows only the single default day (no switcher yet, that's Phase 4), but is correctly day-scoped rather than all-time.
- **Known, deliberate interim gap (not a regression):** `SubmissionGallery.tsx`/`DiagnosticsPanel.tsx` (the actual UI components) are untouched — no day switcher, and `DiagnosticsPanel.tsx`'s local category type/display still only covers 4 of the 5 categories (doesn't render "rejected" yet). Both are explicitly Phase 4 scope.
- Tests: `tests/submission-gallery.test.ts` substantially rewritten (day param threaded through every existing case, `sampledForReview`/`rejected` fixtures added, new describe blocks for all 4 new functions plus `resolveDay`/`pickDefaultDay` — 23 cases net new/changed).
- `tsc --noEmit` clean. Full suite: **199/199 passing** (up from 184/184 after Phase 2).
- Production build (`next build`) deliberately **not** run this phase — a Grafeat `next dev` server is live on port 3002 right now (shares `.next` with a build and would have its chunk cache corrupted); deferred to Phase 6 alongside the others, when it can be run cleanly.

**Phase 4 — done, code-complete (2026-10-31); interactive QA still pending:**
- New files: `app/dashboard/challenges/CurationWorkspace.tsx`, `app/dashboard/challenges/CurationWorkspace.module.css`. Deleted: `app/dashboard/challenges/SubmissionGallery.tsx`, `app/dashboard/challenges/DiagnosticsPanel.tsx` (nothing else imported them — confirmed before deleting).
- `app/dashboard/challenges/[id]/page.tsx`: now resolves `listChallengeDays`/`pickDefaultDay` and fetches all 6 day-scoped pieces (stats, gallery, diagnostics summary, selected, day stats, not-yet-sampled) in parallel, passing them as `initial*` props into `CurationWorkspace`. Same remount-on-sync `key=` pattern as before, just renamed to match.
- One client component (`CurationWorkspace`) owns day/tab/list/mutation state — the single shared optimistic-mutation path required by locked decision #6. Day switcher re-fetches 4 endpoints in parallel on switch. Ready tab: tap-to-select badge (toggles selected/unreviewed) + a separate, visually secondary Reject button + a View button that opens the shared lightbox without touching selection. Set-aside tab: 5 categories (the original 4 automatic exclusions, read-only, plus "rejected" with Undo). Tray: unpaginated, every selected item for the day. Lightbox: real `mentionResult`/`dateEligible` checklist, Escape/arrow-key navigation, actions only shown when opened from Ready/rejected/tray.
- **Two real bugs caught and fixed during self-review, before calling this done:** (1) the View and select-badge buttons were nested inside the card's own `<button>` — invalid HTML, silently non-functional; restructured the tap target to a `div[role=button]` with real sibling buttons. (2) the lightbox's "which list/which actions" logic collapsed every non-Ready/tray source to the "rejected" category, which would have shown the **wrong item** when opened from any of the other 4 diagnostic categories, and would have exposed Select/Reject on a submission that was never actually verified or eligible (`setSubmissionReviewStatus` has no eligibility check of its own — the UI is the only thing stopping that). Fixed by keying the lightbox's source to the specific category and gating actions on an explicit `actionable` flag.
- Verification done: `tsc --noEmit` clean; full suite 199/199 passing (no `lib/` changes this phase); confirmed the page compiles cleanly under the live dev server on port 3002 (unauthenticated request correctly 307s to `/login` rather than 500ing — rules out a module/syntax error, not a substitute for real QA).
- **Explicitly not done, deferred to Phase 5:** challenge switcher, Curate→Compose→Publish stepper, Settings relocation, toasts, richer challenge-list cards.
- **Known limitation — flagging per the "don't present untested work as validated" instruction:** no interactive browser pass has happened. tap-to-select, the Reject/Undo flow, day switching, optimistic-rollback-on-failure, and the lightbox's keyboard navigation have not been exercised by a human or a browser tool. This is real, functioning code wired to the real day-scoped APIs (not placeholder), but it has not been clicked through.

**Phase 5 — done (2026-10-31):**
- New `app/dashboard/challenges/CurateStepper.tsx` (Curate active; Compose/Publish rendered as plain, non-interactive text — genuinely disabled, never a styled-disabled button or a dead link, per the explicit instruction not to present placeholder actions as finished) and `ChallengeSwitcher.tsx` (a native `<select>`, chosen specifically because it gets keyboard/focus support for free at pilot scale rather than needing a custom dropdown).
- Settings relocated off the main curation page to its own route, `app/dashboard/challenges/[id]/settings/page.tsx`, reached via a top-right "Settings" link (closing the §3 fidelity gap). `ChallengeForm.tsx` gained: the `dailyReviewLimit` field (50–500, closing the interim gap flagged at the end of Phase 1 — "Settings UI doesn't expose it yet"), and a client-side timezone lock (the `<select>` disables itself with an explanation once the challenge has any submission, mirroring `updateChallenge`'s own server-side guard instead of only discovering it via a failed save).
- New `lib/challenge.ts` export: `challengeHasSubmissions(db, challengeId)` — factored out of `updateChallenge`'s inline check so the Settings page can show the same rule it enforces. New test added to `tests/challenge.test.ts`.
- `CurationWorkspace` gained a bottom-centered, auto-dismissing toast on every successful select/reject/undo (distinct from the existing inline per-card error text, which stays for failures).
- `app/dashboard/challenges/page.tsx` (the challenges list) now shows discovered/eligible counts and last-sync status per card (one extra `getChallengeSyncStats` call per challenge — fine at this pilot's scale, same judgment already used elsewhere in this codebase).
- `tsc --noEmit` clean. Full suite: **200/200 passing** (up from 199/199 after Phase 3 — Phase 4 added no lib tests).

**Phase 6 — done (2026-10-31):**
- `tsc --noEmit`: clean.
- Full test suite: **200/200 passing**.
- Production build: ran `next build` cleanly (stopped the live `next dev` server on port 3002 first, with your explicit go-ahead, to avoid the known `.next`-cache-corruption hazard; restarted it fresh immediately after — confirmed back up and all touched routes, including the two brand-new ones, responding correctly). Build output confirms every new/changed route compiled: `/api/challenges/[id]/days`, `/api/challenges/[id]/submissions/selected`, `/api/challenges/[id]/submissions/stats`, `/dashboard/challenges/[id]/settings`, plus all previously-existing routes.
- **Manual interactive QA: NOT done.** This environment has no browser. Nothing in the §8 QA checklist (day isolation, grace-period gating by eye, pool stability across a real sync, limit changes, rejection/Undo, tray correctness, lightbox behavior, workspace isolation across routes, post-migration-sync visibility) has been clicked through by a human or a browser tool. Everything described as "done" above means: code written, wired to real (non-placeholder) endpoints, type-checked, unit/integration-tested against a real Postgres dialect (PGlite), and confirmed to compile — not that it has been used.

---

## Final deliverable (2026-10-31)

**Everything requested is now code-complete, locally. Nothing has been committed, pushed, deployed, applied to any shared database, or synced live — all exactly as scoped.**

**Changed files** (`git status --short`, 29 entries):
- *Schema:* `lib/db/schema/challenge.ts`, `lib/db/schema/submission.ts`
- *New migration (generated, not applied):* `drizzle/0006_ux_a_review_sampling.sql`, `drizzle/meta/0006_snapshot.json`, `drizzle/meta/_journal.json`
- *New lib module:* `lib/review-pool.ts`
- *Changed lib:* `lib/challenge.ts`, `lib/submission-gallery.ts`, `lib/sync.ts`
- *New API routes:* `app/api/challenges/[id]/days/route.ts`, `app/api/challenges/[id]/submissions/selected/route.ts`, `app/api/challenges/[id]/submissions/stats/route.ts`
- *Changed API routes:* `app/api/challenges/[id]/route.ts`, `app/api/challenges/[id]/submissions/route.ts`, `app/api/challenges/[id]/submissions/diagnostics/route.ts`, `app/api/challenges/[id]/submissions/diagnostics/[category]/route.ts`
- *New UI:* `app/dashboard/challenges/CurationWorkspace.tsx` + `.module.css`, `CurateStepper.tsx`, `ChallengeSwitcher.tsx`, `app/dashboard/challenges/[id]/settings/page.tsx`
- *Changed UI:* `app/dashboard/challenges/[id]/page.tsx`, `app/dashboard/challenges/page.tsx`, `app/dashboard/challenges/ChallengeForm.tsx`, `app/dashboard/challenges/Challenges.module.css`
- *Deleted:* `app/dashboard/challenges/SubmissionGallery.tsx`, `app/dashboard/challenges/DiagnosticsPanel.tsx`
- *Tests:* `tests/challenge.test.ts` (changed), `tests/submission-gallery.test.ts` (substantially rewritten), `tests/review-pool.test.ts` (new)
- *Docs:* this file, `docs/UX-A-IMPLEMENTATION.md` (new)

**Migration — the one piece requiring separate approval before this is usable beyond local dev:**
```sql
ALTER TABLE "challenge" ADD COLUMN "daily_review_limit" integer DEFAULT 200 NOT NULL;
ALTER TABLE "submission" ADD COLUMN "sampled_for_review" boolean DEFAULT false NOT NULL;
ALTER TABLE "challenge" ADD CONSTRAINT "challenge_daily_review_limit_range" CHECK ("challenge"."daily_review_limit" BETWEEN 50 AND 500);
```
**Safety assessment:** both columns are additive with `NOT NULL DEFAULT`, so every existing row backfills automatically with no table lock beyond the brief metadata change Postgres needs for a constant-default `ADD COLUMN` (fast on modern Postgres/Neon — no full-table rewrite). No column is dropped, renamed, or retyped. No other table is touched. Nothing in the running application reads either new column until this migration has actually run.

**Test/build results:** `tsc --noEmit` clean throughout. Full suite **200/200 passing** (started at 173/173; +27 net new/changed tests across `challenge.test.ts`, `review-pool.test.ts`, `submission-gallery.test.ts`). `next build` succeeds cleanly.

---

## Development database — configured, verified, migration applied (2026-11-01)

**Status: migration 0006 is now applied to the verified Neon development branch. Production is untouched.**

**What happened, in order:**
1. The owner created a Neon branch from production ("Branch data and schema — current snapshot", auto-delete disabled) and pointed `.env.local`'s `DATABASE_URL` at it.
2. The app's first real page load against it failed with the exact "column does not exist" error predicted by the undeployed migration — expected, not a new bug (the dev branch is a snapshot of production's *pre-UX-A* schema).
3. Branch identity was verified **conclusively**, not just by hostname: a read-only `SELECT` against `pg_settings` on the connection `DATABASE_URL` resolves to returned Neon's own control-plane identifiers — `neon.branch_id`, `neon.project_id`, `neon.endpoint_id`, `neon.tenant_id` — directly from the running Postgres instance. The owner cross-confirmed the branch id against Neon Console before anything was written. (A read-only identity check against the separately-labeled `DATABASE_URL_PROD` variable was attempted for extra corroboration and was itself blocked by this environment's own safety classifier — "Production Reads" — which was respected, not worked around. Not needed in the end; the dev-side verification alone was conclusive and owner-confirmed.)
4. A real gap was found and worked around rather than papered over: `drizzle.config.ts` loads env via plain `dotenv/config`, which only reads a `.env` file (none exists in this repo) — it does **not** pick up `.env.local` the way Next.js does. Running `npm run db:migrate` as configured would have silently targeted a placeholder `localhost:5432` connection (which would just fail to connect, not silently hit the wrong real database — nothing is listening on local 5432 — but it also wouldn't do anything useful). Fixed for this one invocation only, with no change to any committed file, using Node's built-in `--env-file` flag: `node --env-file=.env.local ./node_modules/.bin/drizzle-kit migrate`.
5. Pre-migration read-only inspection confirmed: `drizzle.__drizzle_migrations` had exactly 6 recorded entries matching local files `0000`–`0005`; migration `0006` was not recorded; the two new columns and the new check constraint did not exist; cloned data present (**1 challenge, 4 submissions**); no other pending migrations existed beyond `0006`.
6. Migration `0006_ux_a_review_sampling.sql` applied via the command above. **Only** that one migration ran — drizzle's own hash-based tracking skipped `0000`–`0005` automatically, exactly as intended ("constrained to that one pending migration" rather than a blind run of everything pending).
7. Post-migration verification (all read-only): `drizzle.__drizzle_migrations` now has 7 entries (the new one timestamped at apply time); `challenge.daily_review_limit` and `submission.sampled_for_review` both exist; `challenge_daily_review_limit_range` constraint exists; row counts **unchanged** (1 challenge, 4 submissions); the challenge's `name`/`status` and each submission's `processing_status`/`review_status` are byte-for-byte what they were before (one submission's pre-existing `review_status = 'selected'` — a real prior curator decision — is still exactly `selected`); the challenge's new `daily_review_limit` defaulted to `200`; all 4 submissions' new `sampled_for_review` defaulted to `false`, as the column's own default dictates.
8. Dev server restarted fresh on port 3002 (`.next` cleared first). Confirmed healthy: `/` returns 200; `/dashboard/challenges` and `/dashboard/challenges/[id]` both now correctly 307-redirect to `/login` (the expected unauthenticated response) instead of 500ing — the exact query that crashed before (`listChallenges`'s full column list, replayed directly and confirmed to succeed) now works.

**A real, expected consequence of migrating a production *snapshot* rather than running a live sync — reported, not fixed:**
- All 4 cloned submissions have `sampled_for_review = false`. This is correct, not a bug: the review-pool admission pass (`lib/review-pool.ts`) only ever runs inside `runSync`, and no sync has run against this dev branch (none is authorized to — that would be a live Meta sync, explicitly out of scope here).
- Concretely (before the admission run below resolved this): the Ready tab and the tray both showed **0 items**, even though one submission already had `review_status = 'selected'` from before — it didn't surface in the tray either, since the tray's own query also requires `sampled_for_review = true` (intentional: tray membership follows admission, not just a historical decision). The one real challenge-local day is `2026-10-30` (timezone `Asia/Jerusalem`; an earlier read-only check using a raw, non-Drizzle date read misreported this as `2026-10-29` due to a JS `Date`-object timezone-conversion artifact in that ad hoc script, not a real discrepancy — the authoritative value, read the same way the real code reads it, is `2026-10-30`), grace period long elapsed.
- **Resolved (2026-11-01):** the owner separately authorized a one-time `admitToReviewPool` call against this dev challenge only. Executed via `tsx` (project's own TypeScript runner) calling the real `lib/review-pool.ts` function directly — not a reimplementation, not `runSync`, no Meta/Instagram call. Precondition checked explicitly first: the one challenge-local day (`2026-10-30`, timezone `Asia/Jerusalem`) had already cleared its 3-hour grace period, confirmed via the same `isGraceElapsed` the real admission pass uses.
  - **Before:** 4 submissions, `sampled_for_review = false` for all 4.
  - **After:** 4 submissions, `sampled_for_review = true` for exactly **2** (`admitToReviewPool` returned `admitted: 2`).
  - **Verified:** the 2 newly-admitted rows are exactly the 2 that are `processingStatus='completed' AND mentionResult='verified' AND dateEligible=true`; the other 2 (`mentionResult='not_verified'`) were correctly left unsampled. Every row's `reviewStatus` is byte-for-byte unchanged (the pre-existing `selected` decision is still `selected`). Admitted count (2) is well within `dailyReviewLimit` (200). No production writes, no commit/push/deploy, no Meta/Instagram call.
  - **Consequence for browser QA:** the Ready tab should now show 2 items (one already marked `selected` with its badge, one `unreviewed`), and the tray should now show the 1 already-selected item. The 2 `not_verified` submissions remain correctly in Set-aside, untouched.

**Browser QA — what to click first:**
1. Sign in, go to the one cloned challenge ("grafeattest2026", draft status).
2. Day switcher should show exactly one day: `2026-10-30`, already past grace.
3. Ready tab should now show **2 items** — one already badged as selected (a real prior decision, preserved), one unreviewed. Tap-to-select, Reject, and the lightbox are all exercisable here.
4. Tray should show the 1 already-selected item.
5. Set-aside tab should show the other 2 submissions (both `not_verified`), read-only, no "rejected" category yet (nothing's been manually rejected in this dev data).
6. Settings page, the stepper, and the challenge switcher (a no-op dropdown with only one challenge) are all safe to click through regardless.

**Final confirmation:**
- Production database: **not connected to, not modified.** (One read-only identity probe against it was attempted and blocked by the environment's own classifier before it could run — a hard stop, not a near-miss.)
- Production Vercel environment variables: **untouched** — never accessed from this session.
- Meta/Instagram: **no API call made.**
- Git: **no commit, no push.** `git log -1` still shows `6f9b7cc`.
- Deployment: **none.**
- `.env.local`: confirmed gitignored (`.env*.local` pattern) and not tracked (`git ls-files` shows only `.env.example`, a secret-free template).

**Remaining risks / what's genuinely unverified:**
1. **No interactive browser QA** — this is the big one. The curation workspace (tap-to-select, Reject/Undo, day switching, the lightbox, optimistic rollback on a simulated failure) has never been clicked through. Please run the §8 QA checklist in `docs/UX-A-IMPLEMENTATION.md` by hand before trusting this with real organizer use.
2. **Fresh pilot data only** — nothing has exercised this against the actual, currently-connected Meta account's real historical submissions; the existing QA submissions from Slice B predate `sampled_for_review` and will need an authorized sync (not the migration itself) before they show up anywhere.
3. **Visual fidelity is a judgment call, not a pixel match** — I ported the demo's color palette, card treatment, and interaction model deliberately rather than its literal inline-style code, and adapted the fixed-viewport demo shell into this dashboard's normal scrolling page flow. Worth a side-by-side look against `app/landing/curator/*` before considering Phase 5 fully "done" in spirit, not just in code.
4. **Two bugs were caught by self-review, which means more could exist that weren't.** See Phase 4's note above for what was found and fixed (nested buttons; a lightbox item/action leak across diagnostic categories).

**Precise next steps, in order:**
1. You (or a browser-capable session) run the §8 QA checklist by hand.
2. Separately decide and tell me the exact migration target, then approve applying it there.
3. Only after that: an authorized sync against a real connected challenge, to confirm existing QA submissions surface correctly.
4. Only after you're satisfied: commit, and separately, push to `main` (which auto-deploys Vercel) — both still require your explicit go-ahead, not implied by anything above.

*(This section is updated at each phase boundary. If you're resuming this work in a new session: read this section, `docs/UX-A-IMPLEMENTATION.md`, run `git status`/`git log -1`, and confirm actual migration state against what's recorded here before continuing — don't assume prior authorization for anything beyond what §"Authorization boundary" above states.)*

---

This document is the single entry point for anyone (human or agent) picking up Grafeat development. It merges: the architecture review conducted against the actual repository, the historical spike documentation (`SPIKE-RESULTS.md`, `DECISION.md`, `META-SETUP.md`), the running change log (`MERGE-ASSESSMENT.md`), and the decisions made over the course of the production-migration and security-hardening work.

**How to read the labels used throughout:**
- **[VERIFIED]** — confirmed either by reading the actual code/repository, or by a documented, real API test result (cited).
- **[DECISION]** — a choice that was deliberately made and agreed, with its rationale.
- **[RECOMMENDATION]** — a suggestion for what to do next; not yet decided or implemented.
- **[UNKNOWN]** — cannot be established from the repository or conversation; needs a human to resolve it.

---

## Read This First — Current State in 60 Seconds

**Current milestone:** Pre-revenue prototype. The public landing page and the Meta/Instagram OAuth integration are real and working. The actual product — a backend that discovers, stores, and manages real challenge submissions — does not exist yet. What looks like the product in the browser (the "Challenge Curator" UI embedded in the landing page) is a complete, faithful, but **entirely client-side simulation** with seeded fake data, not connected to any real Instagram data or persistence.

**Last completed task:** Second security-hardening patch — `/dev` gated to 404 in production, `robots.txt` added, baseline security headers (CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, path-aware Referrer-Policy) added via `next.config.mjs`, with the OAuth callbacks' stricter `Referrer-Policy: no-referrer` / `Cache-Control: no-store` explicitly re-verified intact against the new global rules (commit `c68708a`). Immediately before that: OAuth CSRF state-cookie protection added and all raw-access-token-reveal functionality removed entirely from both OAuth callbacks (commit `110373e`).

**Next immediate action:** Read `prompts/grafeat-instagram-submission-discovery.md` in full — it is the specification for the next milestone. Then follow the recommended sequence in Section 9: define a minimum viable data model (designed for future multi-organizer support, but scoped to one real organizer and one real challenge for this first milestone) before writing any discovery-pipeline code. There is no database, no organizer/multi-tenant data model, and no background-job infrastructure anywhere in this repository yet, and that specification's implementation steps assume all three exist.

**Most important architectural constraints:**
- No database exists anywhere in this repo (no Prisma/Drizzle/ORM, no schema, no migrations) — confirmed by repository-wide search, not assumed.
- Instagram/Facebook credentials are single-organizer, stored as global Vercel environment variables, obtained by a human manually running an OAuth flow and copying token metadata — there is no "connect your account" product flow or per-organizer storage.
- The Challenge Curator UI (`app/landing/curator/*`) is a client-side demo with seeded fake data. It is **not** reusable backend infrastructure, despite looking like a finished product.
- `app/api/discovery/*` routes are manual test/diagnostic tools (accept credentials as optional query-param overrides, intended for one-off manual testing), not a production service layer.
- Grafeat's own `app/api/discovery/hashtag-search` route does not implement pagination — a separate, undocumented-in-this-repo round of testing (see "Experimentally Verified Meta API Findings") reports pagination working at the API level, but that capability is not yet reflected in this repo's code.

**Known blockers:**
- Two **separate, non-contradictory** facts about hashtag discovery and mention verification, easy to conflate: (1) the API calls are **experimentally verified working** — real cursor pagination (400 results across eight pages), real independent-account mention verification via `mentioned_media.media_id(...)` (`prompts/grafeat-instagram-submission-discovery.md`); (2) whether Meta has **formally granted Advanced Access** for these operations for external Grafeat customers in production is a **separate, still-unconfirmed** question — `DECISION.md`'s last recorded result was an explicit Meta rejection pending review. A capability working under whatever access the testing was done with, and that same capability being approved for arbitrary external production use, are different claims. See the dedicated section below — confirm Advanced Access status directly in the Meta App Dashboard before relying on it in production.
- No test framework or persistence convention exists — both need to be established, not discovered, before the next milestone's acceptance criteria (which require tests and a database) can be met.
- Whether `DIAGNOSTIC_REVEAL_TOKENS` was ever set to `true` in Vercel Production historically (relevant to a Google Search Console "Deceptive pages" flag investigated earlier) was never confirmed — the capability has since been removed entirely from the code, but the historical question itself remains open.

---

## 1. Architecture Overview

**[VERIFIED]** Grafeat is a Next.js 15 (App Router), React 18, TypeScript application with no database, no user/session system, and no background-job infrastructure. It consists of three layers that currently do not talk to each other:

1. **Public marketing site** (`/`, `app/landing/*`) — a complete, styled landing page that embeds a fully interactive but 100%-client-side demo of the intended product ("Challenge Curator", `app/landing/curator/*`).
2. **Real Meta/Instagram integration** (`app/api/auth/*`, `app/api/discovery/*`, `app/api/webhooks/instagram`) — working OAuth and Graph API calls against live Meta endpoints, architected as a single-organizer research/testing harness, not a multi-tenant backend.
3. **Legal/compliance pages** (`/privacy`, `/terms`, `/data-deletion`) for Meta App Review, plus `/dev`, a diagnostic page now gated out of production.

There is no code path anywhere that takes a real, API-discovered Instagram post and renders it inside the Challenge Curator UI. They are two separate systems sharing one repository.

## 2. Repository Map

| Path | Responsibility |
|---|---|
| `app/layout.tsx`, `app/globals.css` | Root layout; self-hosted fonts (`app/fonts/*.woff2`, `next/font/local`); design tokens (`--color-*`, `--font-*`, `--radius-*`) |
| `app/page.tsx`, `app/landing/*` | Landing page sections (Header, Hero, Ritual, Pillars, Duplicate, Faq, Footer); `DemoSection`/`DemoContext`/`EarlyAccessSection` are the only client components outside the curator |
| `app/landing/curator/*` | "Challenge Curator" client-side demo: `curatorData.ts` (seeded fake data generator), `curatorArt.tsx` (procedural placeholder art), `useChallengeCurator.ts` (all state/behavior, one hook), screen components (`TodayScreen`, `ComposeScreen`, `PublishScreen`, `DoneScreen`, `ProjectsScreen`, `SettingsScreen`, `DetailOverlay`, `DuplicateModal`, `ToastBubble`) |
| `app/legal/LegalShell.tsx` | Shared layout for legal pages |
| `app/privacy`, `app/terms`, `app/data-deletion` | Legal/compliance content (production Privacy Policy, Terms of Service, Data Deletion instructions) |
| `app/dev/layout.tsx`, `page.tsx` | Diagnostic page; `notFound()`-gated when `NODE_ENV==="production"`, `noindex` metadata |
| `app/robots.ts` | `/robots.txt`; disallows `/api/` and `/dev` |
| `app/api/auth/facebook/{start,callback}/route.ts` | Facebook Login for Business OAuth |
| `app/api/auth/instagram/{start,callback}/route.ts` | Instagram API with Instagram Login OAuth |
| `app/api/discovery/{poll,mentioned-media,hashtag-search}/route.ts` | Manual test tools exercising Graph API discovery mechanisms — not a production service layer |
| `app/api/webhooks/instagram/route.ts` | GET verify handshake (correct, complete); POST receiver (logs and acknowledges only — no processing logic) |
| `lib/oauth.ts` | CSRF state-cookie generation/verification, callback response hardening (`finalizeCallbackResponse`) |
| `lib/logger.ts` | `logEvent`/`saveFixture` — console + best-effort local-file logging, with secret redaction (`access_token`, `client_secret`, `app_secret`, `code`, `verify_token`, `state`) |
| `next.config.mjs` | Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, path-aware Referrer-Policy) |
| `fixtures/`, `logs/` | Local-dev-only artifacts (gitignored except `fixtures/README.md`) |
| `SPIKE-RESULTS.md` | Raw findings from the original Instagram API spike (Sections 1 and 3 only — authentication and submission discovery) |
| `DECISION.md` | Answers to the spike's 13 open questions, as of its last update — several explicitly marked "not yet tested" |
| `META-SETUP.md` | Meta app configuration checklist |
| `MERGE-ASSESSMENT.md` | Append-only running log of the LP build, font/hydration fixes, legal pages, and both security patches |
| `research_notes/`, `reports/` | Historical Instagram-discovery research notes |
| `prompts/*.md` | Task-brief documents, not application code — includes `grafeat-codebase-onboarding-architecture-review.md` and `grafeat-instagram-submission-discovery.md`, the brief for the next milestone |
| `readme.md` | Stray LP-copy feedback notes — not a conventional README |

**[VERIFIED]** No `prisma/`, `drizzle/`, `middleware.ts`, test config/files, or `vercel.json` exist anywhere in the repository (confirmed by repository-wide search).

## 3. Implementation Status

**Implemented:**
- Landing page, fully built (`app/landing/*`)
- Challenge Curator UI — complete visual/interactive fidelity to its design source, 100% client-side, seeded fake data (`app/landing/curator/*`)
- Instagram Login OAuth — CSRF state, long-lived token exchange (`app/api/auth/instagram/*`)
- Facebook Login for Business OAuth — CSRF state, Page/Business/IG-account-link discovery (`app/api/auth/facebook/*`)
- Webhook verify handshake (`app/api/webhooks/instagram` GET)
- Legal pages, `robots.txt`, baseline security headers, `/dev` production gating

**Partially implemented:**
- Submission discovery — the Graph API call *patterns* for hashtag search and mention verification are proven in `app/api/discovery/*`, but as manual diagnostic tools, not a callable service; `hashtag-search` has no pagination handling; nothing persists any result anywhere
- Webhook *processing* — deliveries are received and logged; nothing is done with the payload

**Missing entirely:**
- Database / ORM / any persistence
- Organizer accounts, sessions, multi-tenancy
- Background jobs, cron, queues, scheduled sync
- Tests — zero test files, no framework configured
- Challenge CRUD (creating/storing a real challenge)
- Any connection between the real Instagram data layer and the Challenge Curator UI
- Real carousel publishing (the UI simulates the full flow; no Graph API publish call exists anywhere in the codebase)

**Uncertain / needs live verification (not determinable from the repository):**
- Current Meta Advanced Access / App Review status for `ig_hashtag_search` (see Section 6)
- Current validity of the Vercel-stored organizer tokens
- Whether `DIAGNOSTIC_REVEAL_TOKENS` was ever `true` in Vercel Production historically (the capability has since been removed from the code entirely, but the historical question is unanswered)

## 4. Key Decisions & Rationale

In roughly chronological order:

1. **[DECISION]** Relocate the Instagram-API-spike diagnostic homepage from `/` to `/dev`, leaving a minimal placeholder at `/`, before building the real landing page — smallest safe first step, unblocks everything else without touching working API code.
2. **[DECISION]** Establish global design tokens (colors, typography, radius/spacing) by extracting exact values from the Claude Design export (`Landing Page.dc.html`) rather than inventing a new design system, applied via `app/globals.css` and scoped away from `/dev` so the diagnostic page's appearance stays unchanged.
3. **[DECISION, later reversed]** Initial landing-page port used a deliberately *scoped* interactive simulation in place of the design export's embedded full product demo, to avoid pulling the entire Challenge Curator product build into the LP stage. **Rejected after review**: "it demonstrates a materially different and much simpler product than the final Claude Design prototype." Replaced with a faithful, full React port of `Challenge Curator.dc.html` — the same component now embedded live in the landing page's demo section. This is the single largest implementation in the repo (`app/landing/curator/*`).
4. **[DECISION]** Fonts self-hosted via `next/font/local` instead of `next/font/google`, after a Vercel production build failure traced to `next/font/google` needing network access to Google's servers *at build time* — which failed on Vercel's build machine but not locally. Fixed for all 5 font families used (2 site-wide + 3 Challenge-Curator-specific), not just the 2 Vercel initially reported, since the same root cause would have hit the other 3 on the next build.
5. **[DECISION]** `suppressHydrationWarning` added to `<body>` after a hydration-mismatch console error traced to `cz-shortcut-listen`, an attribute the ColorZilla browser extension injects client-side — not an application bug.
6. **[DECISION]** Legal pages (`/privacy`, `/terms`, `/data-deletion`) fully rewritten for production under a shared `LegalShell` component, explicitly flagging several unresolved legal/business decisions rather than inventing them (see Section 7).
7. **[DECISION]** `FACEBOOK_LOGIN_CONFIG_ID` made an environment variable (previously hardcoded to the original Spike app's Configuration ID) after diagnosing a "Feature unavailable" Meta OAuth error — a Facebook Login for Business `config_id` is scoped to the specific Meta app it was created in, and the hardcoded value belonged to a different app than the one now in production.
8. **[DECISION]** Facebook OAuth does **not** need a separate `fb_exchange_token` long-lived-token-exchange step. Initially recommended adding one (based on the general client-side-SDK short-lived-token pattern); corrected after the user reported a real production `expires_in` of ~60 days, which proved the server-side authorization-code exchange (performed with `client_secret` present from the first call) already returns a long-lived token directly from Meta.
9. **[DECISION]** OAuth raw-access-token-reveal functionality (`DIAGNOSTIC_REVEAL_TOKENS`) removed **entirely** from both OAuth callbacks, rather than merely gating it more tightly, after it was identified as the leading hypothesis for a Google Search Console "Deceptive pages" flag and Chrome blocking the Facebook callback URL. A page that, after an OAuth-like flow, can display a live access token at a public unauthenticated URL is structurally identical to what Safe Browsing's phishing heuristics are built to catch, regardless of intent.
10. **[DECISION]** OAuth CSRF protection added (`lib/oauth.ts`): cryptographically random `state`, HttpOnly/Secure-in-prod/SameSite=Lax cookie, distinct cookie names per provider, verified before any code exchange, cleared on every exit path including errors.
11. **[DECISION]** `/dev` gated to return `404` in production via `NODE_ENV` check (not just unlinked), `robots.txt` added, baseline security headers added. During implementation, testing revealed that Next.js's `next.config.mjs` `headers()` **overrides** a header a route handler sets on its own response for the same key — an incorrect assumption was caught by testing against a real production build, not left unverified. Fixed by scoping the stricter OAuth-callback `Referrer-Policy: no-referrer` to all of `/api/*` instead of fighting a single blanket rule.

## 5. Instagram/Meta Integration Map

**[VERIFIED]** Two independent OAuth products, no shared abstraction:
- **Instagram Login** (`app/api/auth/instagram/*`) — `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`, scopes `instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments, instagram_business_content_publish`. Token exchange returns a long-lived token in one step plus an inline `user_id`.
- **Facebook Login for Business** (`app/api/auth/facebook/*`) — `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`/`FACEBOOK_LOGIN_CONFIG_ID`, a pre-created Configuration (not classic `scope=`) granting `instagram_basic, instagram_manage_comments, pages_show_list, pages_read_engagement, business_management`. The code-exchange call already returns a long-lived (~60 day) user token directly (see Decision 8).

**[VERIFIED]** Connected accounts are not modeled as data anywhere. "Connecting an account" means a human visits `/api/auth/*/start`, approves on Meta, and manually copies token metadata into Vercel env vars (`ORGANIZER_ACCESS_TOKEN`, `FACEBOOK_ORGANIZER_ACCESS_TOKEN`, and the two corresponding `*_IG_USER_ID` vars — deliberately separate, see below).

**[VERIFIED — SPIKE-RESULTS.md §3.1]** The Instagram user/account ID is **not portable** between the two login products: Instagram Login and Facebook Login use two different numeric ID namespaces for the same underlying Instagram account. Using the wrong one produces a Meta "does not exist" error that looks like a permissions problem but isn't. This is why `ORGANIZER_IG_USER_ID` and `FACEBOOK_ORGANIZER_IG_USER_ID` exist as separate env vars.

**[UNKNOWN]** Whether `ORGANIZER_IG_USER_ID` (currently sourced only from the inline `user_id` field of the Instagram Login token-exchange response) has ever been independently cross-checked against `GET graph.instagram.com/me?fields=id,username`. A local-only verification procedure was recommended but whether it was run, and with what result, is not recorded here.

**[VERIFIED]** Webhook verify handshake (`app/api/webhooks/instagram` GET) correctly implements `hub.mode`/`hub.verify_token`/`hub.challenge`. The POST receiver logs and acknowledges any payload but performs no processing.

**[REPORTED, not verifiable from code]** Per `prompts/grafeat-instagram-submission-discovery.md`, the webhook is subscribed to the `mentions` and `comments` fields in the Meta App Dashboard. This is dashboard configuration, not something this repository's code can confirm either way — `META-SETUP.md`'s checklist lists `mentions` as the field to subscribe but is an unchecked template, not a record of what was actually done.

## 6. Experimentally Verified Meta API Findings

**Detailed, source-cited record:** `docs/meta-api-experiments.md` documents every experiment summarized in this section individually — purpose, request pattern (placeholders only), observed outcome, evidence source, and confidence/verification label. This section is the narrative summary; that document is the traceable detail behind it.

This section distinguishes three different kinds of claim that are easy to conflate: **code that exists in this repo and has been read**, **API test results documented in `SPIKE-RESULTS.md`/`DECISION.md`**, and **API test results reported in the newer `prompts/grafeat-instagram-submission-discovery.md` brief**, written after `DECISION.md`. The newer brief's experimental findings and `DECISION.md`'s recorded Meta rejection are not contradictory — they answer two different questions (see "Two distinct, non-contradictory facts" below).

### From the original spike (`SPIKE-RESULTS.md`, `DECISION.md`) — Sections 1 and 3 only; Sections 4–22 explicitly never executed

- **[VERIFIED — tested]** Both OAuth paths authenticate successfully.
- **[VERIFIED — tested]** `mentioned_media` retrieval (Facebook Login token, field-expansion syntax) works, confirmed against a known historical media ID.
- **[VERIFIED — tested]** Native `/tags` polling (Instagram Login, Standard Access) works, but **only for UI-tagged media, not caption `@mentions`.**
- **[VERIFIED — tested, negative result]** Caption-only `@mention` webhook delivery: two tests (Tests C/D), both using deliberately non-role-holder participant accounts, showed **no webhook delivery**. Leading theory in `DECISION.md`: Standard Access may only deliver webhook events triggered by people who have a role on the app — **explicitly recorded as credible but not fully isolated**, not confirmed.
- **[VERIFIED — tested, explicit rejection]** `ig_hashtag_search` (Test E) returned an explicit Meta error: *"To use 'Instagram Public Content Access', your use of this endpoint must be reviewed and approved by Facebook."* This was Meta's own stated response, not an inference.

### From `prompts/grafeat-instagram-submission-discovery.md` (newer — the specification for the next milestone; also the source of the following experimentally verified findings)

This document states its findings are "based on successful real-world tests, not assumptions." No accompanying fixture, log, or code in this repository implements what it describes, so these are not independently re-derivable by reading code — but per explicit direction, they are to be treated as verified experimental findings, attributed to this source:

- **[VERIFIED EXPERIMENTALLY] Hashtag discovery with cursor pagination works.** `GET /ig_hashtag_search` → `GET /{hashtag_id}/recent_media` with `limit` and `paging.cursors.after`-based pagination: **400 posts were successfully retrieved across eight pages** from the active `#inktober` hashtag, with further pagination available. Public Personal-account posts were returned **without participant OAuth**. Important caveats stated in the same document: pagination timestamps are not guaranteed strictly ordered across pages, and feed completeness is not established — don't assume a fixed historical lookback.
- **[VERIFIED EXPERIMENTALLY] Genuine mention verification via field-expansion works for independent (non-role-holder) accounts.** `GET /{organizer_ig_id}?fields=mentioned_media.media_id({candidate_media_id}){id,username,caption}` successfully returned mention information for posts published by **independent public Personal accounts** — accounts with no role on the Grafeat app. The document explicitly warns: captions returned by the API may have the `@` stripped from genuine mentions, so **do not verify mentions by searching caption text** — use this field-expansion call instead. It also explicitly warns `GET /{organizer_ig_id}/mentioned_media` (without the field-expansion syntax) is **not** the correct endpoint.
- **[REPORTED, consistent with DECISION.md]** Mention webhooks still do not reliably trigger for independent accounts — this matches, rather than contradicts, the earlier Tests C/D null result.

These two verified findings are evidence the underlying API operations work. They are **not**, on their own, evidence of confirmed production Advanced Access for external customers — see below.

### Two distinct, non-contradictory facts — experimentally verified API access vs. confirmed production Advanced Access

These are two separate claims about two different things. Both can be true at once; neither implies or rules out the other. They should not be read as conflicting results that need reconciling.

**Fact 1 — [VERIFIED EXPERIMENTALLY] The API operations themselves work.** Per `prompts/grafeat-instagram-submission-discovery.md`:
- Hashtag discovery with cursor pagination (`GET /ig_hashtag_search` → `GET /{hashtag_id}/recent_media`, `paging.cursors.after`) successfully retrieved **400 posts across eight pages** from the active `#inktober` hashtag, including public Personal-account posts returned without participant OAuth.
- Genuine mention verification via the field-expansion pattern (`GET /{organizer_ig_id}?fields=mentioned_media.media_id({candidate_media_id}){id,username,caption}`) successfully returned mention information for posts published by **independent public Personal accounts** — i.e. accounts with no role on the Grafeat app.

This is real, demonstrated, working API behavior — not an assumption, and not contradicted by anything else in this repository.

**Fact 2 — [UNKNOWN] Whether this reflects confirmed, formal Advanced Access for external Grafeat customers in production is separately unconfirmed.** `DECISION.md`'s last recorded result was an explicit Meta rejection of `ig_hashtag_search` pending "Instagram Public Content Access" review. Fact 1 does not resolve Fact 2 one way or the other — the experimental tests could have succeeded under Advanced Access that has since been granted, or under some other access path (a developer/admin-role account, a specific token, a temporary or narrower allowance) that would not automatically extend to arbitrary organizers and arbitrary public hashtags in production. **This repository does not contain the information needed to determine which — confirm directly in the Meta App Dashboard before relying on hashtag search as a production discovery mechanism for external customers.** This is a gap to fill with a direct check, not an assumption to make either way.

## 7. Known Limitations / Architectural Gaps

1. **No persistence layer.** The single largest gap. Nothing in this repo stores a challenge, a submission, or a connected account as data.
2. **Single-organizer credential model.** Env-var-based, not database-backed, not per-organizer. A real multi-tenant product needs a materially different credential architecture, not an extension of this one.
3. **No background-job infrastructure.** No cron, queue, or scheduler exists.
4. **The Challenge Curator UI is not reusable backend infrastructure**, despite complete visual/interactive fidelity. It is pure client-side React state over seeded fake data (`curatorData.ts`).
5. **`hashtag-search`'s pagination is unimplemented** in this repo's code, regardless of the newer brief's reported API-level success (see Section 6).
6. **No tests, no test framework.** Zero precedent to follow.
7. **Legal pages contain explicitly flagged unresolved items**, not invented to fill gaps: no governing-law/dispute-resolution clause, no specific stated data-retention period, no committed deletion-request SLA, no formal GDPR/CCPA rights mechanism. See `app/terms/page.tsx` and `app/privacy/page.tsx` content and `MERGE-ASSESSMENT.md`'s legal-pages section for the full list.
8. **CSP requires `'unsafe-inline'` for both `script-src` and `style-src`** — the former because Next.js's App Router injects inline hydration scripts, the latter because the Challenge Curator UI is deliberately built with inline `style={{}}` React objects (a faithful port of its design-tool source). Tightening either requires real follow-up work (nonce-based CSP via `middleware.ts`; a CSS Modules refactor of the curator component tree), not a quick fix.
9. **Git push from this agent's environment does not work** — no GitHub credential access from the sandboxed execution environment used for this work (`osxkeychain` inaccessible). Both recent security-patch commits were created locally and had to be pushed manually by the user from their own machine.

## 8. Unresolved Questions

- **Advanced Access status** for `ig_hashtag_search`/Instagram Public Content Access — see Section 6. Needs direct confirmation in the Meta App Dashboard.
- **Whether `DIAGNOSTIC_REVEAL_TOKENS` was ever `true` in Vercel Production** — relevant to the Google Search Console "Deceptive pages" investigation; the capability no longer exists in the code, but the historical question of whether a real token was ever exposed this way was never confirmed.
- **Whether `ORGANIZER_IG_USER_ID` has been cross-verified against `graph.instagram.com/me`** — a procedure was recommended; whether it was run is not recorded.
- **Current validity of the organizer tokens stored in Vercel** — not checked as part of any task in this history.
- **Persistence technology choice** — no decision has been made (Postgres+Prisma, Supabase, SQLite, something else).
- **Background-sync infrastructure choice** — no decision has been made (Vercel Cron is the lowest-friction option given the existing deployment, but this is an unevaluated suggestion, not a decision).
- **Test framework choice** — no decision has been made.
- **Whether "App Review" progress tracked outside this repository** (e.g., in the Meta Developer dashboard) has moved since `DECISION.md` was last updated — that document itself only covers Sections 1 and 3 of a larger, never-completed spike plan.

## 9. Next Development Milestone

**Specification:** `prompts/grafeat-instagram-submission-discovery.md` is the specification for this milestone — read it in full before starting any implementation work.

It calls for a reliable submission discovery and eligibility-verification pipeline — hashtag discovery with pagination, genuine-mention verification via the field-expansion pattern, persisted submission records, incremental synchronization, and a review gallery wired to real data — explicitly scoped to **not** include carousel publishing, AI ranking, participant OAuth, or broad refactoring.

**[RECOMMENDATION]** This is a suggested sequence, not a previously approved architecture decision. Nothing below has been agreed as "the" plan; it reflects what currently looks like the safest order given everything else in this document, and should be revisited if it conflicts with a decision made elsewhere.

1. **Resolve architectural choices and define the minimum viable data model**, designed for future multi-organizer support even though the first milestone only needs to serve one real organizer. Keep the immediate product scope narrow — one real organizer and one real challenge are sufficient for the first end-to-end milestone — but don't shape the schema in a way that unnecessarily blocks multi-organizer support later (e.g., don't hardcode a single-organizer assumption into primary keys/uniqueness constraints if a nullable or default-scoped `organizer_id` column costs nothing now).
2. **Establish the database, schema/migrations, and persistence** — nothing in the current repo exists to extend here; this is new infrastructure, not a migration of existing infrastructure.
3. **Implement production hashtag discovery and genuine-mention verification as real services**, reusing the already-proven API call patterns in `app/api/discovery/*` as reference — not by treating those diagnostic routes themselves as production infrastructure. They were built as manual test tools (credentials as optional query-param overrides, no persistence, no pagination in `hashtag-search`) and need a real service-layer rewrite, not a thin wrapper.
4. **Implement incremental, idempotent synchronization** — retries, scan-state persistence and resumption, deduplication across runs — with an **explicitly chosen** scheduling approach (e.g. Vercel Cron) rather than an implicit or deferred one.
5. **Connect real eligible submissions to an organizer review/selection gallery**, reusing appropriate presentation components from the Challenge Curator client-side demo where they genuinely fit — without assuming its state management (`useChallengeCurator.ts`) is backend infrastructure. It isn't; only the visual/interaction layer is reusable, not the data layer.
6. **Validate the end-to-end workflow and failure cases** — including the failure modes this document already flags as open (Advanced Access uncertainty, unordered/incomplete hashtag pagination, API errors and rate limits).

**Testing is not step 6 or an afterthought.** Automated tests should be introduced **alongside** each of steps 2–5 as they're built, consistent with `prompts/grafeat-instagram-submission-discovery.md`'s own acceptance criteria — not postponed until the end.

Also still true and unchanged from before starting this sequence:
- Confirm Advanced Access status directly in the Meta Dashboard before committing to hashtag search as the primary discovery mechanism in production (see Section 6 / `docs/meta-api-experiments.md`).
- Follow the specification's own phased structure within each step rather than reordering it further.

---

*This document should be kept up to date as a living handover — update it, don't let it drift, when the next major decision or milestone lands.*
