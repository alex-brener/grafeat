# Grafeat UX-A — Demo-to-Production Technical Implementation Plan

**Task type:** Investigation and implementation planning only. **Do not implement.**

## Context and objective

Slice B has passed real-browser QA with actual Instagram submissions: discovery, organizer-mention verification, eligibility, gallery images, Select / Reject / Undo, persistence after refresh and sync, and automatic gallery refresh after manual sync. The existing interactive landing-page demo (`app/landing/curator/*`) is the **approved UX/UI specification**, not just inspiration.

Prepare an **implementation-ready UX-A plan** to make the actual organizer interface match the demo as faithfully as possible while replacing synthetic content and simulated behavior with real data and working actions. Inspect the repository and its current state; do not rely on summaries alone. Do not redesign the demo.

Relevant code includes `app/landing/curator/*`, `app/dashboard/*`, challenge list/detail pages, `SubmissionGallery`, `DiagnosticsPanel`, review and sync routes, data-access functions, schema, auth/workspace checks, and existing tests. Consult `docs/HANDOVER.md`, `docs/DECISIONS.md`, and the existing Grafeat UX Alignment Plan where useful.

## Locked product and UX decisions

### 1. Faithful demo experience

Replicate the demo's layout, hierarchy, typography, spacing, color application, challenge navigation, Curate → Compose → Publish stepper, 4:5 artwork cards, selection indicators, selected-items tray, detail lightbox, Ready / Set aside tabs, toasts, and responsive behavior. Prefer reuse/adaptation of demo components and styles when sensible; avoid creating parallel implementations unnecessarily.

Preserve the real application's robust loading, empty, and error states. Never copy synthetic counters, fake publish actions, fabricated eligibility rules, or misleading sync messages. Compose and Publish are visibly future steps but must be disabled/unavailable until implemented in Slice C.

### 2. Settings outside daily curation

Match the demo's **top-right Settings link** and dedicated challenge-settings screen. Keep challenge configuration out of the everyday review interface. Reuse the existing challenge form, validation, and APIs; no new caption templates or publishing defaults in UX-A.

### 3. Gallery and selection

- Match the demo's artwork-card appearance and primary **tap/click artwork to select; tap again to deselect** gesture.
- Preserve real `unreviewed`, `selected`, and `rejected` review statuses. Unselected does **not** mean rejected.
- Make Reject an explicit secondary action (e.g., detail overlay or contextual menu), not a three-state tap cycle and not three prominent buttons on every card.
- Display the demo's selection indicators and immediate action feedback.
- Keep the **entire image visible** using `object-fit: contain` inside a consistent approximately 4:5 card area with a neutral letterbox background. Do not crop calligraphy or illustration details.
- Every gallery card must retain a distinct **View** control. View opens the lightbox **without** changing selection.

### 4. Shared full-image lightbox

Both **View on a gallery card** and **clicking artwork in the selected-items tray** open the **same** modal/lightbox implementation. Match the demo closely: complete artwork, creator credit, caption/metadata, prev/next navigation, and appropriate selection/rejection actions. Closing the modal must not change review status. Show only actual eligibility checks supported by the backend (e.g., organizer mention and publication-date eligibility); do not invent a daily hashtag rule. Plan accessible keyboard/focus/escape behavior and mobile layout.

### 5. Complete cross-page selected-items tray — mandatory

The tray must represent **all persisted selected submissions for the active challenge and challenge-local publication day**, not just cards loaded on the current gallery page. It must stay correct across pagination, filters, navigation, refresh, sync, and optimistic mutations.

- Selection adds an item immediately; deselection/removal removes it everywhere.
- Clicking a tray item opens the shared lightbox.
- Tray count and contents must be complete, not silently truncated at gallery page size.
- Use secure server-backed retrieval independent of gallery pagination; investigate the smallest query/API addition if needed.
- Handle optimistic updates and rollback on failure; prevent stale sync refreshes or concurrent mutations from overwriting state.
- Address potentially large selections and image URL expiry/fallback.
- Do **not** introduce final carousel ordering or publishing state in UX-A. The initial tray order should be deterministic, stable, and explicitly non-final; ordering for the actual carousel belongs to Slice C.
- Investigate the current data model for challenge-local publication-day scoping. **Do not assume** the existing `reviewStatus` schema or queries already support per-day selections or ordering; identify any gap and propose the smallest safe solution, including migration only if genuinely necessary.

### 6. Ready / Set aside

Match the demo's peer-tab experience:

- **Ready:** eligible submissions, both unreviewed and selected.
- **Set aside:** automatically ineligible submissions and explicitly manually rejected submissions, **distinguished by reason and origin**.
- Retain accurate diagnostics and exclusion reasons without making technical processing information dominate curation.
- Inspect the current diagnostics and gallery queries; propose any minimum secure extension needed. Respect pagination, large datasets, and workspace authorization.

### 7. Sync and navigation

Retain functional manual **Sync now** and truthful last-sync status in the demo's visual style. **Automatic background sync is a confirmed future requirement**, but not UX-A; never show unsupported “checks every 15 minutes” claims. Replicate the demo's challenge switcher and richer challenge cards using real challenge names, dates, status, and progress. Preserve challenge creation/editing. Defer Duplicate challenge and its granular inherit-settings modal.

## Technical investigation required

Inspect and explain:

1. Exact demo-to-production component/style mapping: reuse, adapt, replace, or create.
2. Proposed component tree and server/client boundaries.
3. Current gallery cursor pagination and current review mutation semantics.
4. Cross-page selected-items retrieval, data shape, count accuracy, and synchronization with optimistic gallery state.
5. Challenge-local publication-day filtering and any timezone/date-boundary edge cases.
6. Shared lightbox data access for gallery items, tray items, and potentially excluded items; prev/next scope.
7. Ready / Set aside query and pagination strategy, including manually rejected items.
8. Auth/workspace authorization on any new endpoint; avoid client-supplied ownership assumptions.
9. Image fallback, media URL expiration, loading behavior, and responsive artwork containment.
10. Whether any schema change is unavoidable, with an explicit rationale and safer alternatives.
11. How the UX can evolve into Slice C without implementing Compose/Publish prematurely.

Avoid a new global state-management framework or unrelated refactoring unless a concrete need is demonstrated. Preserve verified Slice B functionality and security checks.

## Deliverables

Return a single concise but implementation-ready Markdown plan with these sections:

### A. Component mapping

Table: demo component → current production component → proposed action → affected files → complexity/dependencies.

### B. Target UX and architecture

Screen hierarchy and navigation; data flow; state ownership; tray and lightbox behavior; gallery/Set aside pagination; server/client boundaries; sync and optimistic-update consistency.

### C. Backend and schema delta

Enumerate **each** proposed API/query/schema change (including “none” if applicable), why required, authorization and performance implications, and alternatives. Be explicit about the distinction between selecting submissions and composing an ordered carousel.

### D. Implementation sequence

Small, independently testable steps, **prioritizing curation over cosmetic challenge-list polish**. For each: files/components, dependencies, acceptance criteria, tests, and any manual QA. Include an approval gate before any migration or security-sensitive change.

### E. Fidelity and QA checklist

Concrete desktop/mobile comparisons against the actual demo. Include cross-page tray selection (more than one gallery page), persistence, View-vs-select event handling, rejected vs excluded items, keyboard lightbox navigation, image aspect ratios, API failures/rollback, and post-sync state.

### F. Genuine blockers and decisions

Only surface real implementation conflicts. **Do not reopen approved UX decisions** without evidence of a technical blocker. Highlight any tradeoffs that need explicit approval.

## Execution boundaries

**Read-only planning task.** Do not edit code, environment variables, or docs; do not apply migrations, run sync, alter Meta permissions/connections, commit, push, or deploy. Do not begin Slice C. Report current Git/deployment assumptions accurately; do not presume that production is on an older commit. Return the plan and wait for approval.
