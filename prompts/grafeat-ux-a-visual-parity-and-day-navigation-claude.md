# Grafeat — UX-A Visual Parity + Challenge-Day Navigation

## Mission

Bring the **authenticated Grafeat UI** into faithful visual and interaction parity with the **existing, approved full-screen landing-page demo**, and close the demo's identified **missing day-navigation** gap. This is **not a redesign**. Reuse what is already built; do not approximate the demo by inventing new layouts or styles.

The user will attach **four exact screenshots** alongside this prompt:
1. **Curate / day review** — the full-screen demo's gallery, stepper, top header, selection tray.
2. **Challenges** — the full-screen demo's challenge list.
3. **Compose** — the full-screen demo's composition page.
4. **Publish** — the full-screen demo's publishing preview.

These screenshots represent the **approved visual design**. The source of truth for behavior, DOM, CSS, assets, and components is the **actual full-screen demo code** under `app/landing/curator/*` (trace any imports outside that directory). The *full-screen mode*, not the embedded landing-page preview, is the canonical reference. The existing authenticated UX-A implementation is the functional baseline, not the visual reference.

**Important scope distinction:** Curate and Challenges are the currently implemented real UX-A surfaces. Compose and Publish screenshots are **future Slice C visual specifications**, included here to establish shared shell/header/stepper/day navigation continuity. **Do not implement real Compose, publishing, scheduling, media processing, or Meta API calls in this task.** Keep unavailable stages honestly disabled or marked forthcoming, consistent with the agreed UX-A boundary.

## Before coding: inspect and map, don't guess

1. Read `HANDOVER.md`, `docs/UX-A-IMPLEMENTATION.md`, the approved UX-A architecture, and current repository status.
2. Trace the **full-screen demo** entry point, mode switch, page/component hierarchy, styles, design tokens, fonts, image handling, header, stepper, challenge cards, Curate gallery, selected tray, lightbox, and mobile variants. Identify which components can be directly reused or extracted as shared presentation components.
3. Trace the authenticated challenges page and `CurationWorkspace`, including day-scoped APIs, selection/rejection, tray, pagination, settings, permissions, and navigation.
4. Produce a short **demo → authenticated implementation mapping** with concrete file paths, a discrepancy list, and a minimal reuse/refactor plan. The four screenshots are authoritative for the visual target. If the current repo's full-screen demo renders differently from them, **stop and report the mismatch before changing the design**.
5. If browser automation is available, capture both surfaces at identical viewport/zoom (e.g. 1440×900 and mobile) and compare. If not, explicitly state that browser visual verification is unavailable; never claim screenshot parity based on TypeScript or source review alone.

## Visual parity: preserve the approved design

- Reuse/extract demo components and CSS rather than creating a second lookalike implementation. Prefer **one presentation layer with demo fixtures vs real-data adapters** where sensible; avoid risky wholesale refactors if a small shared-component extraction is safer.
- Match the supplied screenshots' **full-width editorial layout, cream background, serif display typography, restrained olive/black palette, header height, whitespace, tabs, grid/card sizing, artwork aspect ratio, badges, View buttons, selected tray and action placement**, as well as responsive behavior.
- On Curate, preserve the large day heading, explanatory copy, eligibility/collection summary, Ready/Set aside peer tabs, and the persistent bottom selection tray. Keep gallery artwork **uncropped** (`object-fit: contain`) and the lightbox separate from tap-to-select.
- On Challenges, match the screenshot's spacious list, artwork mosaic, status, actions, and editorial typography using **real challenges and truthful data**. Do not fabricate publication counts, progress, collection times, or thumbnails. Use a tasteful empty/unknown state where the real backend lacks a metric or image.
- Preserve real UX-A capabilities: day-scoped data, stable sampled pool, selection persistence across refresh/pagination, selected tray showing **all** selections for that day, Reject/Undo, Set aside distinction, real lightbox with eligibility information, settings, optimistic rollback, loading/error/empty states, mobile usability, and accessibility.
- Demo claims such as “checks every 15 minutes,” published feature counts, and automated activity must **not** appear as real facts unless implemented and supported by data. Keep truthful manual-sync/last-sync information.
- Avoid regressions to the landing-page demo. If presentation components are shared, ensure the demo still renders and behaves as approved.

## New requirement: challenge-day navigation

The supplied screenshots expose a gap: the header shows `Creative October 2026  Day 16 of 31 ▾`, but there is no functional way to navigate between challenge days. Implement this **in the authenticated UX-A UI** and, where feasible without disrupting the demo, make the demo control functional too using fixture data.

### Primary control: existing header day selector

- Turn the **existing `Day N of M ▾` affordance next to the challenge name** into a compact, accessible challenge-day picker. Do **not** add a separate Days page or a bulky navigation bar.
- The picker is **challenge-day based**, not a generic free-form date input. Display day numbers and corresponding calendar dates in the challenge's configured timezone, accounting for month boundaries and challenge start/end dates. A compact month-grid popover is acceptable if it fits the demo's aesthetic; preserve the existing header typography and density.
- Clearly indicate selected day. Distinguish available past days, available empty days, not-yet-available days (grace period still open), and future days. Do not let users curate an unavailable day. Do not assume all challenge days have submissions.
- If publication status is not yet persisted, **do not invent “published” indicators**; reserve that state for future Slice C.
- Support keyboard navigation, focus management, Escape, and responsive/mobile presentation. Avoid trapping users in a popover.

### Secondary control: unobtrusive adjacent-day shortcuts

- Add subtle previous/next available-day arrows near the large `Day N` heading **on Curate only**, without diminishing the display typography. Disabled/unavailable states must be clear. The header picker remains the primary jump navigation.
- Respect the existing default-day behavior: latest challenge day whose grace period has elapsed, rather than blindly using the current date.

### Day isolation and URL/navigation behavior

- Use the **existing day-scoped backend APIs and `submission.challengeLocalDay`** as the authoritative identity; never recalculate a submission's day in the browser from UTC timestamps.
- Changing day must update gallery, counts, Ready/Set aside, selected tray, and any lightbox context atomically, without stale data or cross-day selection leakage. Persisted decisions on other days remain unchanged. Handle rapid day switching and in-flight requests safely.
- Prefer a stable, shareable URL query parameter or route segment for the selected day if it fits the existing router; use browser back/forward correctly and preserve day selection on refresh.
- The challenge switcher and “Open day” action should take users to the latest available day for that challenge, not an unavailable current/future day.
- Design the header day-selector component so **future Compose and Publish** can use the same selected-day context, but **do not implement those stages now**. A future day change while a Compose draft is dirty will require a save/confirm policy; document it as Slice C work rather than pretending drafts exist.
- Keep timezone locking after submissions, grace-period rules, review-limit semantics, and review-pool admission untouched.

## Implementation sequence

1. Audit + mapping and flag any ambiguity. If source/demo conflict with screenshots, pause for clarification.
2. Extract/reuse the existing full-screen demo presentation layer for the **Challenges** and **Curate** authenticated surfaces. Preserve working backend integrations; don't swap in demo fixture data.
3. Implement accessible header day picker and Curate prev/next shortcuts against real day availability; make demo day picker interactive only if safely possible without visual regression.
4. Test all key behaviors: day switching (including month boundary, empty/unavailable days), selections/tray persistence and isolation, rejection/undo, lightbox, refresh/back-forward, rapid navigation, responsive layout, and existing demo.
5. Run TypeScript, relevant unit/integration tests, and a production build. If `.next` is shared with the running dev server, **stop/restart it gracefully around `next build`**, and confirm `localhost:3002` is healthy afterward.
6. Update `HANDOVER.md` and `docs/UX-A-IMPLEMENTATION.md` with actual files changed, demo reuse map, tests, known deviations, and an **unchecked human browser-QA checklist**. Do not mark visual QA passed unless it was genuinely performed.

## Non-negotiable authorization boundaries

- **No commits, pushes, deploys, production migrations, or production DB connections.**
- No live Meta/Instagram sync, posting, scheduling, likes, comments, or external side effects.
- Do not change production Vercel environment variables, Meta app settings, or credentials.
- The isolated Neon development branch is the only permitted DB environment; prefer no DB writes beyond ordinary UI interactions required for explicitly approved local QA. Do not seed synthetic data without permission.
- No new Compose/Publish feature development in this pass.
- Do not modify the approved visual language or quietly remove existing UX-A functionality.

## Definition of done

The authenticated **Challenges and Curate** screens should look like the attached full-screen demo screenshots, with the same presentation primitives rather than an imitation, while using real data. The header day selector must actually navigate eligible challenge days, and all day-scoped state must remain correct. Automated checks must pass. Any visual parity claim must be backed by real browser comparison or explicitly left for the user's manual review.

**Deliver a concise report and stop for user QA/approval.**
