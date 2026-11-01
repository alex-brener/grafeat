# Grafeat UX-A — Implement the approved full-screen demo, not a redesign

## Objective
The authenticated curation workspace is functionally working, but visually differs substantially from the **approved full-screen interactive demo**. Fix UX-A visual parity **before** starting Compose/Publish. The approved full-screen demo is the binding UI implementation/specification. **Reuse what already exists; do not invent a replacement design.**

## Canonical reference
- Inspect `app/landing/curator/` and trace every component, style, asset, state transition, and layout rule used by its **full-screen mode**.
- The landing-page embedded/preview mode is **not** the target. The full-screen mode is the target.
- Inspect the authenticated `CurationWorkspace` and surrounding dashboard shells/layouts to find where divergence occurs.
- The user will attach two screenshots: (A) approved demo in full-screen mode, (B) current authenticated workspace, captured at the **same browser viewport and zoom**. Treat (A) as visual acceptance reference. Ask for them if not attached. Do not infer visual fidelity from code inspection alone.
- If you have a browser tool, render both modes at identical viewport sizes, capture screenshots, and compare. If no browser tool is available, explicitly state that visual parity remains subject to the user's browser QA.

## First: audit before changing code
1. Locate the full-screen entry point and its component tree. Identify reusable components/styles/assets and any demo-only data adapters.
2. Locate the production workspace's component tree and its existing real data/API adapters.
3. Produce a concise, concrete parity matrix: full-screen reference element → existing source component/style → current workspace equivalent → action (reuse/adapt/remove). Cover: page shell/background; header; challenge switcher; stepper; day navigation; Ready/Set aside tabs; gallery grid; 4:5 cards; artwork `object-fit: contain`; selection badges; explicit View and Reject/Undo controls; selected tray; lightbox; toasts; typography; spacing; colors; responsive breakpoints.
4. Identify the **smallest-change approach** to reuse the demo's presentational components/styles while preserving authenticated workspace data and behavior. Do not start a wholesale redesign.

## Implementation rules
- Prefer **extracting/sharing** demo presentation components (or moving them into a shared module) so both demo full-screen and authenticated workspace render from the same UI implementation, with demo fixtures vs real data supplied through separate adapters. Avoid creating a second visually similar copy that can drift.
- If a direct shared component is genuinely impractical, explain why and copy the exact existing styling/layout rules, not an approximation.
- Preserve the full-screen layout geometry and hierarchy. Avoid extra dashboard chrome, wrappers, padding, max-width constraints, or backgrounds that alter it. Trace parent layouts as well as child components.
- Keep the real UX-A functionality intact: challenge/day switching, day-scoped Ready and Set aside, persistent selection and all-day tray across pagination/refresh, explicit Reject/Undo, full-resolution lightbox with separate View action, accurate stats, truthful sync status, timezone/grace rules, and Settings access.
- Integrate necessary real-only controls (especially day switcher and Settings) minimally, without replacing or rearranging the approved design. No fake demo counters/data in authenticated views.
- Maintain keyboard and mobile behavior. No nested buttons; clicking View must not change selection; no lightbox item/action leak.
- **Do not implement Compose, Publish, Meta sync, auto likes/comments, billing, or unrelated refactors.** The Compose/Publish steps may remain visibly disabled per UX-A scope.

## Validation
- Compare the **full-screen** demo and authenticated workspace at identical desktop viewport/zoom; also verify a mobile viewport. Provide before/after screenshots if a browser is available. Otherwise provide a precise user QA checklist and flag visual validation as pending.
- Test selection, refresh persistence, Ready/Set aside, Reject/Undo, tray, day switcher, and lightbox after any component extraction. Ensure the demo still works independently with fixtures.
- Run TypeScript checks, full tests, and `next build`. Coordinate build with the dev server so `.next` isn't used concurrently; restart the server afterward if stopped.
- Summarize exactly what was reused, extracted, or changed, remaining intentional differences, and any deviations from the full-screen reference.
- Update `HANDOVER.md` and `docs/UX-A-IMPLEMENTATION.md` before/throughout the work and with final QA status. Preserve context across long sessions.

## Authorization boundaries
- Work locally against the verified Neon **development** branch only. No production DB access or writes; no migrations; no Meta/Instagram calls or live sync.
- No commits, pushes, deployments, Vercel changes, or environment/credential changes without explicit approval.
- Do not silently alter the approved demo to make the two interfaces appear to match. Any shared-component change must preserve the demo's approved visual output.

## Completion criterion
The authenticated workspace should look and behave like the **approved demo in full-screen mode**, with real data substituted for demo fixtures and only the necessary day-specific functionality integrated. **Code-complete is not visually approved** until the user compares the rendered UI in a browser.
