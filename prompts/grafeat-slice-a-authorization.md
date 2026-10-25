# Grafeat — Slice A Implementation Authorization

Date: 2026-10-24

## Context
Read `HANDOVER.md`, `docs/meta-api-experiments.md`, and `prompts/grafeat-callivember-architecture-implementation-brief.md` before implementing. The first external pilot targets Callivember beginning November 1, 2026.

Confirmed operational constraints:
- Vercel plan: **Hobby**. Do not assume frequent cron schedules; design manual `Sync now` for the next slice and daily cron only as a possible backstop. Do not upgrade the plan without approval.
- Meta Advanced Access: **unknown**. Do not claim external organizer onboarding works based solely on developer/admin tests. Investigate app mode, exact permissions, access levels, and review status separately; report the evidence and blockers.

## Approved technical direction
- Neon PostgreSQL + Drizzle ORM, with reviewable migrations.
- Better Auth, after a short compatibility spike with the current Next.js version, Drizzle adapter, and organization model. Prefer native organization/member models over duplicate bespoke workspace tables. If unsuitable, **stop and request approval** before changing libraries.
- Email magic-link sign-in first, then Google sign-in. Email delivery requires a provider; identify configuration and secrets needed without inventing credentials.
- Separate workspaces for independent organizers; one member per workspace initially. Enforce authorization server-side on every workspace-owned operation.
- Meta OAuth connections owned by workspace, retaining the distinct Facebook Login and Instagram Login flows/ID namespaces.
- Encrypt access tokens at rest using authenticated encryption (e.g., AES-256-GCM) with server-only keys. Track token expiry, status, and reconnect behavior; never log or expose raw tokens.
- Vitest tests for core authorization and security behavior.

## Authorized Slice A implementation
1. Verify repository state and report any divergence from handover.
2. Validate Better Auth integration in a bounded spike; present any blocking incompatibility before proceeding.
3. Add database configuration, schema, migrations, and environment-variable documentation.
4. Implement email authentication and basic organizer workspace creation/selection; implement Google if practical within Slice A without jeopardizing the core path.
5. Implement workspace-aware Meta OAuth start/callback state binding, token persistence, reconnect/update handling, and connection status. Preserve proven token-exchange behavior as much as practical.
6. Add automated tests: workspace isolation, unauthorized access, OAuth state tampering/expiry, token confidentiality, reconnect behavior.
7. Run available checks, summarize changes, and document setup instructions and any required manual configuration.

## Architectural invariants
- Non-null workspace ownership for workspace-owned records; follow Better Auth's native schema conventions where applicable.
- Avoid duplicate User/Organization/Member models when the auth library supplies them.
- Never accept a workspace ID from the browser without checking current-user membership and permission.
- OAuth callback must securely correlate to the initiating authenticated user/workspace; handle lost sessions and replay safely.
- Token encryption key stays server-side and must not be committed. Do not put tokens in URLs, logs, or client payloads.
- Do not expose production diagnostic routes or weaken existing security protections.
- Do not modify the existing simulated landing-page curator experience unless strictly required; explain any necessary change.

## Outside Slice A (do not implement yet)
- Real submission discovery, hashtag scans, mention verification, review-gallery backend, scheduling, or queues.
- Stripe checkout, billing webhooks, subscription enforcement.
- Multi-member workspace invitations and roles UI.
- Public showcases, carousel publishing, growth/referral features.
- Vercel plan upgrade or production deployment without approval.

## Execution and reporting
Proceed with Slice A in small testable steps. Stop for approval if a fundamental architectural decision changes or if required credentials/services are unavailable. At the end, report changed files, migrations, tests/results, required secrets/provider setup, security considerations, and readiness for Slice B. Do not claim Meta Advanced Access is approved without evidence.
