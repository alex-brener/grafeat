# Grafeat UX-A — Implementation Authorization (Local Only)

## Objective
Implement the approved **Grafeat UX-A — Final Architecture (Locked)** plan, including the earlier approved demo-to-production UX fidelity requirements. The final architecture and original UX-A plan are the specifications; this prompt adds execution safeguards, not new product scope.

## Authorization boundary
You are authorized to **edit code, add tests, and generate a database migration locally**. You are **not** authorized to apply a migration to production or a shared database, change production environment variables, commit, push, deploy, run live Meta syncs, or make external account changes. Do not push `main` (it auto-deploys Vercel). If local testing requires a database migration, identify the target and request approval before applying it to any non-disposable database. Never print secrets.

## Locked requirements
1. One independent curation workspace per challenge-local publication day, using the existing immutable `challengeLocalDay`. Default to the latest grace-elapsed day; provide day navigation. A day not past its grace period is visibly unavailable for review.
2. Sampling starts **only after** the challenge-local day ends plus its configured grace period. Use existing immutable random `allocationRank`, but persist review-pool membership as `sampledForReview`; never reshuffle, evict, or silently replace admitted submissions. Allow top-ups after later syncs only if capacity remains.
3. Challenge-level `dailyReviewLimit`: minimum 50, default 200, maximum 500. Decreases do not evict already admitted items. Existing `dailyProcessingCapacity` stays internal and unchanged for UX-A.
4. Distinguish discovered, processed/verified, eligible, sampled/displayed, and selected counts accurately. Eligible-but-not-sampled items get a count/explanation, **not** another browsable gallery. Avoid claims of complete Instagram discovery or perfect fairness.
5. Ready and Set aside are peer tabs; eligible manually rejected items move to Set aside with explicit rejection reason distinct from automatic exclusions. Preserve Undo.
6. Persistent selection tray shows **all selected items for the active day**, across pagination, filters, refresh, and sync; no silent 500-item tray truncation. One shared optimistic mutation path, consistent rollback.
7. Reproduce the existing interactive landing-page demo as faithfully as practical: 4:5 cards with `object-fit: contain`, tap to select, separate View action, shared lightbox accessible from gallery and tray, keyboard/focus handling, top-right Settings, challenge navigation, and Curate → Compose → Publish stepper with latter two disabled. No fictional eligibility checks or automatic-sync claims.
8. Lock challenge timezone once any submission exists, with clear validation feedback.
9. Multiple challenges per organization must continue to work. Do not implement multi-Instagram-account connections, subscriptions, active-slot enforcement, Compose/Publish, automated likes/comments, or automatic periodic sync in UX-A.

## Implementation safeguards
- **Admission integrity:** inspect existing sync lease semantics and transaction boundaries. Ensure an admission-pass failure cannot be mistaken for a successful completed sync. Use a coherent transaction for admission where practical, or a well-tested idempotent retry strategy with explicit error propagation. Preserve capacity under concurrent requests and sync retries. Document the actual guarantee rather than asserting the lease makes every write atomic.
- **Late discovery:** the grace-period gate does not prove discovery completeness. Preserve previously admitted items and explain how late arrivals can fill only remaining slots. Do not imply a mathematically uniform sample over undiscovered posts.
- **Migration:** generate and inspect the additive migration locally; verify defaults, constraint, and compatibility with existing QA submissions. **Stop for explicit approval before applying it to production/shared DB.** If migration execution is needed for integration tests, use an isolated disposable test DB only if already configured and safe.
- **Regression:** preserve workspace authorization, Meta permissions/rate-limit behavior, current sync processing, legal routes, and existing tests. Do not broaden scope into refactoring.

## Context continuity and handover (mandatory Step 0)
Before editing application code or generating a migration:
1. Read the existing root `HANDOVER.md` in full, together with `docs/DECISIONS.md` and any existing UX-A design/architecture documentation. Inspect the actual repository; do not overwrite or discard existing handover content.
2. Create or update `docs/UX-A-IMPLEMENTATION.md` as the **durable technical specification**. Record the locked architecture, the original demo-to-production fidelity requirements, relevant existing code paths, data model/migration, admission and day-scoping rules, UX components, implementation phases, acceptance tests, known limitations, and explicit out-of-scope items. If the full earlier UX-A plan is not present in the repository or current context, identify that gap rather than inventing details.
3. Update root `HANDOVER.md` as a **concise operational entry point**: current objective and status; link to `docs/UX-A-IMPLEMENTATION.md`; locked product decisions; baseline branch/HEAD and working-tree status; approval boundaries; phase-by-phase checklist (pending/in progress/done); migration state (generated vs. applied, and to which DB); tests/build status; blockers; and the exact next safe action. Preserve previous project handover sections.
4. Keep the handover current **after each meaningful implementation phase and before context compaction or ending the session**. Record actual files touched, commands/tests run and results, migration state, unresolved questions, and next step. Never mark untested work as validated or an unexecuted migration as applied.
5. At the start of any resumed/new Claude Code session, read `HANDOVER.md` and `docs/UX-A-IMPLEMENTATION.md`, verify the working tree and migration state, then continue from the documented next step rather than repeating completed work or assuming prior authorization for restricted actions.
6. These documentation edits are **local-only** under the same authorization boundaries: no commits, pushes, deployments, or migrations to shared/production databases without explicit approval. Documentation is a checkpoint, not permission to perform restricted actions.

## Execution sequence
0. Complete the context-continuity and handover steps above **before coding**; keep both documents updated as work progresses.
1. Inspect current repository and confirm baseline branch, working tree, test/build status, and exact migration target; report any surprises before changing application code.
2. Implement schema and challenge validation; generate migration but do not apply to production/shared DB.
3. Implement review-pool admission after processing with grace gate, stable membership, correct error handling, and concurrency/idempotency tests.
4. Implement day-scoped gallery, diagnostics, tray, stats, and selected-items APIs, including authorization and pagination tests.
5. Implement day navigation and the demo-aligned curation workspace, Settings placement, selection tray, lightbox, Ready/Set aside, and truthful loading/error states.
6. Run TypeScript, relevant unit/integration tests, production build, and manual QA where feasible. Do not present placeholder View actions as finished functionality.

## Required QA
- Different challenge days remain fully isolated; switching days restores selections.
- Before grace elapsed, no review pool; afterward, deterministic admission.
- Pool remains stable across refresh, pagination, sync, and late arrivals; no overshoot on retry/concurrency.
- Raising limit admits more on a later sync; lowering never evicts.
- Rejection moves eligible items from Ready to Set aside; Undo restores them.
- Tray includes all selected items for the active day, independent of gallery page; optimistic rollback works.
- Gallery View and tray artwork open the same lightbox without changing selection; full artwork visible without cropping.
- Workspace isolation is enforced on every new route.
- Existing QA submissions become available after an authorized post-migration sync; do not silently assume an automatic backfill.

## Deliverable and approval gate
At completion, provide: updated `HANDOVER.md` and `docs/UX-A-IMPLEMENTATION.md` status; changed-file summary; migration SQL and safety assessment; test/build results; any incomplete manual QA; screenshots or visual comparison if available; remaining risks; and precise instructions for the **separate** production migration/deployment authorization. **Do not commit, push, deploy, apply production migration, or run a live Meta sync without my explicit approval.**

If an unexpected architectural blocker appears, stop and present the smallest decision needed rather than improvising a product change.
