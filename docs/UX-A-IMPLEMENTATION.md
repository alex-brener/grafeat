# Grafeat UX-A — Implementation Specification

**Status as of 2026-11-01: migration 0006 applied to a verified Neon development branch (cloned from production, auto-delete disabled); a one-time, explicitly-authorized `admitToReviewPool` run has populated its Ready tab/tray (2 of 4 cloned submissions admitted); production untouched throughout.** See `HANDOVER.md`'s "Development database" section for the full verification record (branch identity, pre/post-migration checks, data preservation, and the admission run's before/after counts). Below this line, **all 5 implementation phases code-complete** (schema/migration generated-not-applied, review-pool admission, day-scoped APIs, curation workspace UI, demo-fidelity polish) — `tsc`/full test suite/production build all verified clean, **but no interactive browser QA has been done** (no browser in this environment; see §8, still entirely unchecked, and `HANDOVER.md`'s "Final deliverable" section for the full risk list). This is the durable technical specification for UX-A (demo-to-production UX alignment + daily curation & stable sampling). It consolidates three planning rounds conducted in the same working session (demo-vs-dashboard audit → daily-sampling architecture revision → final locked architecture) into the current, authoritative state. Where an earlier round's recommendation was superseded by a later locked decision, only the final decision is recorded here — the evolution itself isn't repeated.

Source code and the live schema are authoritative over this document if they ever disagree. See `docs/HANDOVER.md` for Slice B (challenges/discovery/processing/sync) and `docs/DECISIONS.md` for the product/architecture decisions UX-A builds on — this document doesn't repeat either, it extends them.

---

## 1. What UX-A is

Make the real organizer dashboard match the landing-page interactive demo (`app/landing/curator/*`) as faithfully as practical, replacing synthetic content and simulated behavior with real data and working actions — **and** add daily-isolated curation with a stable, fair, capacity-bounded review sample per publication day. The demo is the binding UX/UI specification, not inspiration.

**Explicitly not UX-A:** Compose/Publish (carousel assembly, ordering, actual Instagram publishing), Challenge Duplicate, automated likes/comments, periodic automatic sync, multi-Instagram-account connections per organization, subscription/billing enforcement, active-challenge-slot enforcement. All deferred to later slices — see §9.

## 2. Locked product decisions (final)

1. **Daily isolation.** A challenge has separate publication days (`submission.challengeLocalDay`). Each day has its own Ready/Set-aside view, review decisions, selected tray. Default view: the latest grace-elapsed day; day navigation to others. A day not past its grace period is visibly unavailable for review — no preview pool for the still-open day.
2. **Stable sampling.** Sampling for a day starts only after that day ends + its grace period elapses. Random order via the existing `allocationRank` (uniform, assigned once at discovery, never recalculated). Membership is **persisted** (`sampledForReview`), never re-derived at read time. Never reshuffles, evicts, or replaces an admitted item. Top-ups allowed later only while capacity remains.
3. **`dailyReviewLimit`:** configured once per challenge in Settings. Minimum 50, default 200, maximum 500. Decreases never evict already-admitted items. `dailyProcessingCapacity` stays exactly as-is (`null`/unlimited, no UI) — unrelated, unchanged.
4. **Transparent counts**, per day: discovered, processed/verified, eligible, sampled/displayed-for-review, selected. Eligible-but-not-sampled is a count/explanation only — never a second browsable gallery. Never claim complete Instagram discovery or perfect fairness over undiscovered posts.
5. **Ready / Set aside are peer tabs.** Ready = sampled, not rejected. Set aside = automatic exclusions (4 reasons) **plus** manually-rejected eligible items, distinguishable by reason/origin. Undo always works.
6. **Selected tray** shows every selected item for the **active day**, across pagination/filters/refresh/sync — no silent truncation. One shared optimistic-mutation path (gallery card, tray item, lightbox action all call the same mutation, with rollback on failure).
7. **Demo fidelity:** 4:5 cards, `object-fit: contain` (never crop), tap-to-select with numbered badges, explicit separate Reject (not a 3-state tap-cycle, not 3 prominent buttons), a distinct **View** control opening a shared lightbox without changing selection, keyboard/focus-accessible, Curate→Compose→Publish stepper with the latter two genuinely disabled, top-right Settings link, challenge switcher, richer challenge cards.
8. **Timezone lock:** a challenge's `timezone` becomes immutable once it has any submission, with a clear validation error.
9. **Multiple challenges per organization** must keep working (already true structurally). No multi-Instagram-account support, no billing/slot enforcement, in UX-A.

## 3. Verified repository facts this spec depends on

All confirmed by direct code reads this session, not inherited from memory:

- `submission.challengeLocalDay` — date-only string, computed **once** at discovery via `lib/timezone.ts`'s `toZonedDateString(publishedAt, challenge.timezone)`, immutable thereafter (discovery's upsert never touches it on update). DST/midnight-boundary correctness already covered by `tests/timezone.test.ts`.
- `submission.allocationRank` — DB `random()` default, set once at discovery, never recalculated. Already orders `runProcessing`'s per-day candidate selection for the same "unbiased by posting time" goal.
- `challenge.processingGracePeriodHours` (default 3) gates `runProcessing` via `lib/timezone.ts`'s `isGraceElapsed` — the exact function the new admission gate reuses.
- `challenge.dailyProcessingCapacity` — nullable integer, **no schema default → `NULL` → unlimited**. Zero UI references anywhere (confirmed by repo-wide grep). Only enforced inside `runProcessing`'s atomic budget charge.
- `lib/challenge.ts`'s `updateChallenge` currently accepts and writes `timezone` with **no guard** — this is the one piece of existing, tested behavior this spec changes.
- `lib/sync-lease.ts` — one row per **challenge**, atomic `INSERT ... ON CONFLICT DO UPDATE ... WHERE lockedUntil < now()`. Already fully prevents overlapping syncs for the same challenge — the admission pass reuses this for free by running inside `runSync`.
- `meta_connection` is uniquely indexed on `(organizationId, provider)` — one Facebook Login connection per organization, shared by every challenge that org owns. Real, current constraint; not something UX-A changes.
- `getGallerySubmissions` today does **not** exclude `reviewStatus='rejected'` — rejected items currently stay visible in the gallery, just badge-marked. Real gap, not cosmetic.
- `SubmissionCardData`/`GalleryItem` currently lack `mentionResult`/`dateEligible` — needed for the lightbox's real (not fabricated) two-item checklist.
- `docs/DECISIONS.md`'s "Fairness cannot be guaranteed when discovery is incomplete" is the existing epistemic caveat this spec's sampling-fairness language extends, not a new claim.

## 4. Data model

```sql
-- submission
ALTER TABLE submission ADD COLUMN sampled_for_review boolean NOT NULL DEFAULT false;

-- challenge
ALTER TABLE challenge ADD COLUMN daily_review_limit integer NOT NULL DEFAULT 200;
ALTER TABLE challenge ADD CONSTRAINT challenge_daily_review_limit_range
  CHECK (daily_review_limit BETWEEN 50 AND 500);
```

Both additive, both default-safe (`NOT NULL DEFAULT`, so existing rows backfill automatically). No new table. No new index beyond the existing `submission_challenge_local_day_idx` (reused as-is; revisit only if a real query-plan problem appears at a scale this pilot hasn't reached). `reviewStatus`, `mentionResult`, `dateEligible`, `allocationRank`, `challengeLocalDay` are all unchanged.

**Backfill:** none needed. Existing rows get `sampledForReview=false`; the next sync's admission pass picks up already-eligible rows automatically (their days are already well past grace period).

## 5. Algorithm

**Timing gate:** a day is eligible for its first admission pass only once `isGraceElapsed(day, challenge.timezone, challenge.processingGracePeriodHours)` — same function `runProcessing` already calls.

**Admission pass** (`lib/review-pool.ts`, new — `admitToReviewPool`), called once per sync, after discovery + processing, before `sync_run` finalization, for every grace-elapsed day of the challenge being synced:

1. `remaining = dailyReviewLimit - count(sampledForReview=true for this day)`.
2. If `remaining <= 0`, skip.
3. Else select up to `remaining` rows where `challengeLocalDay=day AND processingStatus='completed' AND mentionResult='verified' AND dateEligible=true AND sampledForReview=false`, ordered `allocationRank ASC`.
4. For each, in one small transaction (mirrors `lib/processing.ts`'s `completeSubmission` exactly): `UPDATE submission SET sampled_for_review=true WHERE id=? AND sampled_for_review=false`, stop once `remaining` is exhausted.

Re-running this every sync against **every** grace-elapsed day (not just newly-crossed ones) is what makes late-arrival top-ups work for free — a day under capacity just keeps incrementally filling. Idempotent by construction: re-running against an already-full day matches zero rows.

**Concurrency:** admission runs inside the same `runSync` call that already holds the per-challenge `sync_lease` — no new lock. A settings update racing a sync (limit changed mid-sync) can, at worst, cause one sync to admit up to the *old* limit in that one pass — self-correcting on the next sync, never evicts, judged an acceptable edge case rather than one needing a cross-request lock.

**Honesty:** the sample is uniform over what was discovered and verified by admission time — never a claim about the true total population under the hashtag. Same epistemic caveat already established in `docs/DECISIONS.md`, extended one layer up from processing allocation to display sampling.

## 6. Endpoint / component map

| Function/route | Change |
|---|---|
| `getGallerySubmissions` | add `challengeLocalDay=day AND sampledForReview=true`, keep `reviewStatus != 'rejected'` |
| `getDiagnosticSummary`/`getDiagnosticSubmissions` | add `challengeLocalDay=day`; categories stay at 5 (pending/technical_failure/not_verified/outside_dates/rejected) |
| `getNotYetSampledCount` (new) | one count: eligible AND `sampledForReview=false` — inline text, not a route with a list |
| `getSelectedSubmissions` (new, tray) | add `challengeLocalDay=day`, `reviewStatus='selected'` |
| `getDayStats` (new) | discovered/processed/eligible/sampled/selected, day-scoped, honest (only counts actually-processed rows) |
| `listChallengeDays` (new) | distinct `challengeLocalDay` values — powers the day switcher |
| `setSubmissionReviewStatus` | unchanged |
| `lib/challenge.ts` `updateChallenge` | reject `timezone` change once any submission exists; validate `dailyReviewLimit` 50–500 |
| `lib/review-pool.ts` `admitToReviewPool` (new) | called from `runSync`, after processing, before finalization |

All new/changed functions keep the existing `getChallenge(db, organizationId, challengeId)` workspace check exactly as-is, day filter added alongside.

## 7. Implementation phases

- [x] **Phase 1 — Schema + challenge validation.** Migration generated locally (`drizzle/0006_ux_a_review_sampling.sql`, not applied to any database). `updateChallenge` timezone lock + `dailyReviewLimit` validation (optional field — Settings UI doesn't expose it until Phase 4/5, so omitting it leaves the existing value untouched). 176/176 tests passing, `tsc --noEmit` clean.
- [x] **Phase 2 — Review-pool admission.** `lib/review-pool.ts`'s `admitToReviewPool`, wired into `lib/sync.ts`'s `runSync` after `runProcessing`, before `sync_run` finalization (runs unconditionally, including on a partial sync — admission has no Meta call so it can't itself be rate-limited). 8 new tests in `tests/review-pool.test.ts` (grace gating, verified/eligible/completed-only filter, allocationRank ordering + limit cutoff, idempotency, top-up on a later run, decrease-never-evicts, per-day isolation). 184/184 tests passing, `tsc --noEmit` clean.
- [x] **Phase 3 — Day-scoped read APIs.** `lib/submission-gallery.ts`: `getGallerySubmissions`/`getDiagnosticSummary`/`getDiagnosticSubmissions` now take an explicit `day` and are fully day-isolated; `getGallerySubmissions` now also excludes `reviewStatus='rejected'` (closes the gap noted in §3) and requires `sampledForReview=true`; `DIAGNOSTIC_CATEGORIES` grew a 5th entry, `"rejected"` (manually-rejected eligible items, distinguishable from the 4 automatic exclusions). New: `getSelectedSubmissions` (tray, unpaginated by design), `getDayStats`, `getNotYetSampledCount` (count-only, never a list), `listChallengeDays` (day switcher), `resolveDay`/`pickDefaultDay` (shared "which day" resolution — explicit `?day=` or default to the latest grace-elapsed day). Routes updated: `submissions`, `submissions/diagnostics`, `submissions/diagnostics/[category]` all take `?day=`; new routes `submissions/selected`, `submissions/stats` (bundles day stats + not-yet-sampled count), `days`. `app/dashboard/challenges/[id]/page.tsx` updated to resolve a day before its (still pre-Phase-4, day-switcher-less) gallery/diagnostics calls. `SubmissionCardData` gained `mentionResult`/`dateEligible` (closes another §3 gap, for Phase 4's lightbox). 23 new/changed tests in `tests/submission-gallery.test.ts`. 199/199 tests passing, `tsc --noEmit` clean. **Not yet done:** `SubmissionGallery.tsx`/`DiagnosticsPanel.tsx` still show only the single default day with no switcher, and `DiagnosticsPanel.tsx`'s local 4-category type doesn't yet render the 5th "rejected" category — both explicitly Phase 4 scope, not a regression.
- [x] **Phase 4 — Curation workspace UI** (code-complete; interactive browser QA still pending — see below). New `app/dashboard/challenges/CurationWorkspace.tsx` + `CurationWorkspace.module.css`, replacing `SubmissionGallery.tsx`/`DiagnosticsPanel.tsx` (deleted). One client component owns all shared state (day, tab, lists, pending mutations, lightbox), per locked decision #6's single shared optimistic-mutation path — day switcher, Ready/Set-aside tabs (5 Set-aside categories, the 4 automatic ones read-only, "rejected" with Undo), tap-to-select badge distinct from a separate Reject control, shared lightbox (opened from Ready/rejected-category/tray, real mentionResult/dateEligible checklist, read-only when opened from an automatic-exclusion category — `setSubmissionReviewStatus` has no eligibility guard of its own, so the UI must not offer Select/Reject on a never-eligible item), tray (unpaginated, per `getSelectedSubmissions`). `tsc --noEmit` clean; 199/199 tests passing (lib untouched this phase); page confirmed to compile cleanly under the running dev server (redirect-to-login smoke check, no module/compile error). **Two real bugs found and fixed during self-review before this was considered done:** nested `<button>`s (View/select-badge inside the card's own button — invalid HTML, silently broken), and a lightbox list/action leak where opening it from a read-only diagnostic category showed the wrong item (index collision with `readyItems`) and would have exposed Select/Reject on an unverified/ineligible submission. **Not yet done — explicitly deferred to Phase 5:** challenge switcher, Curate→Compose→Publish stepper, Settings relocation, toasts, richer challenge-list cards. **Known limitation:** no interactive browser pass has been done (no browser/session access in this environment) — tsc/tests/compile-smoke-test are not a substitute for exercising tap-to-select, the lightbox, day switching, and the optimistic-rollback paths by hand.
- [x] **Phase 5 — Demo-fidelity polish** (code-complete; same interactive-QA caveat as Phase 4). New `CurateStepper.tsx` (Curate active, Compose/Publish shown as genuinely-disabled plain text, not fake-clickable), `ChallengeSwitcher.tsx` (native `<select>`, free keyboard/focus support). Settings relocated off the main page to `app/dashboard/challenges/[id]/settings/page.tsx`, linked via a top-right "Settings" link; `ChallengeForm` gained the `dailyReviewLimit` field (closing the Phase 1 interim gap) and a client-side timezone lock (disabled + explained once `challengeHasSubmissions` is true — new exported helper in `lib/challenge.ts`, factored out of `updateChallenge`'s own guard so the UI shows the same rule instead of discovering it via a failed save). `CurationWorkspace` gained a toast (bottom-centered, auto-dismissing) on every successful select/reject/undo. Challenges list page now shows discovered/eligible counts and last-sync status per challenge (one `getChallengeSyncStats` call per challenge — fine at pilot scale). Added `challengeHasSubmissions` test. `tsc --noEmit` clean; 200/200 tests passing; both the detail and settings routes confirmed to compile cleanly under the live dev server.

(Phase status is tracked live in `HANDOVER.md`'s checklist, not duplicated here — this list is the fixed plan, that one is the current state.)

## 8. QA checklist

- [ ] Different days fully isolated; switching restores that day's selections
- [ ] Before grace elapsed: no review pool. After: deterministic admission
- [ ] Pool stable across refresh/pagination/sync/late-arrival — no overshoot on retry
- [ ] Limit increase admits more on a later sync; decrease never evicts
- [ ] Rejection moves eligible items Ready→Set-aside; Undo restores
- [ ] Tray includes every selected item for the active day, independent of gallery pagination; rollback on failure works
- [ ] Gallery View and tray artwork open the same lightbox, never changing selection; no cropping
- [ ] Workspace isolation enforced on every new route
- [ ] Existing QA submissions become visible after an **authorized** post-migration sync — never assumed as an automatic backfill

## 9. Explicitly out of scope (later slices)

Compose/Publish, Challenge Duplicate, auto-likes/comments, periodic automatic sync, multi-Instagram-account connections, active-slot/billing enforcement, bounded/early-stopping processing (sketched as a future optimization only — not needed at current pilot scale; see rationale in conversation history / this file's §5 if revisited).

---

*Keep this file current at each phase boundary. Record actual files touched, test results, and migration state in `HANDOVER.md`'s operational checklist — don't let this document and reality drift apart.*
