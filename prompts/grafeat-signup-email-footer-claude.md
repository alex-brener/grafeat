# Grafeat — Early-signup email regression + dynamic LP copyright

## Context and boundaries

We are temporarily pausing the UX-A curation work. The current working branch is `feature/ux-a-curation`; recent UX-A visual-parity changes may be uncommitted or in a WIP commit. The live marketing site is `https://grafeat.com/`. The user reports that the **early-signup form no longer sends email notifications** and requests this exact footer wording, with a dynamic year:

`© 2026 Brener Digital LLC` (render the current calendar year automatically, not a hardcoded 2026).

These are two narrowly scoped marketing-site maintenance tasks. Do not resume UX-A work, refactor unrelated code, or modify curation database schema. Do not push, deploy, merge, commit, apply migrations, or trigger live external requests without explicit approval.

## Task A — Diagnose and fix early-signup email

1. Trace the complete signup flow in the repository: landing-page form, client validation, submission handler/server action/API route, persistence (if any), email provider/integration, notification recipients, environment variables, and error handling. Identify the **actual mechanism** in use; do not assume a provider.
2. Distinguish the following outcomes explicitly: browser submission accepted; record persisted; notification API called; provider accepted the message; message delivered to inbox. A successful HTTP response or provider API response is **not** proof of inbox delivery.
3. Check recent relevant changes, code paths, validation and silent failures. Compare the current feature branch with `main` where useful. Determine whether the reported problem exists in production, local development, or both. Avoid attributing the regression to recent UX-A changes without evidence.
4. Inspect configuration safely. Never print secrets, API keys, full connection strings, or personal signup data. Do not overwrite production/Vercel environment variables. If production logs or provider dashboards are inaccessible, explain exactly which redacted evidence or manual check the user should supply; do not guess.
5. Implement the smallest reliable fix justified by the evidence. Preserve existing signup UX and any intended database storage. Ensure actionable server-side error logging without leaking secrets or subscriber information; don't show a false success state when the request actually failed. Keep client responses privacy-safe and avoid exposing internal provider details.
6. Add or update automated tests for the failure mode and successful path, using mocked external services. No real email sends or live form submissions without a separate explicit go-ahead. If there is a risk of duplicate signup or notification on retries, address it conservatively or flag it.
7. Report whether the issue is conclusively fixed in code or whether production-specific configuration, email deliverability, sender-domain authentication, suppression lists, provider quotas, or deployment still need verification. Do not claim delivery without evidence.

## Task B — Copyright in the marketing landing-page footer

1. Locate the existing footer of the **public Grafeat landing page**, not the authenticated curator UI or its demo full-screen header.
2. Add a visually restrained copyright line using the exact legal entity name **Brener Digital LLC** and the © symbol. Use a runtime-derived year (e.g. `new Date().getFullYear()`) so the displayed year updates automatically. Do not hardcode `2026` as the final value.
3. Preserve existing footer content, links, typography, responsive spacing, and accessibility. Avoid hydration mismatches if server and client rendering cross a year boundary; use the simplest appropriate implementation for the existing rendering architecture.
4. Check mobile and desktop layout at the code level; if browser tooling is unavailable, disclose that visual QA remains manual.

## Workflow and verification

- Start by reporting a concise root-cause hypothesis and a list of files you intend to change. Investigate before editing.
- Keep changes limited to the early-signup pipeline, LP footer, and directly related tests/docs. Do not silently mix in UX-A work.
- Run TypeScript checks, relevant tests, full test suite, and `next build` if feasible. If the dev server and build share `.next`, gracefully stop/restart the server as previously agreed; report any interruption.
- Summarize: root cause and evidence, exact fix, changed files, tests/build results, required production configuration or deployment steps, and any remaining manual checks.
- Update `HANDOVER.md` with a short, sanitized status note so this work can be resumed later. Avoid unnecessary changes to UX-A documentation.
- **Stop for approval. No commit, push, merge, production deployment, production DB write/migration, Meta sync, or real outbound test email unless explicitly authorized.**

## Branch/deployment safety

If these marketing fixes need to reach production before UX-A is ready, **do not deploy the entire `feature/ux-a-curation` branch**. Explain a safe release strategy: isolate the two verified marketing fixes into a small branch based on `main` (for example, by cherry-picking a dedicated commit or selectively porting only those files), then request approval before pushing or deploying. Keep the UX-A feature branch intact.
