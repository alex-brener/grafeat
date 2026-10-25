# Grafeat — Callivember Architecture and Implementation Brief

**Date:** 2026-10-24  
**Target:** Usable external-organizer pilot for Callivember beginning November 1, 2026.

## Context and authoritative materials

Read `HANDOVER.md`, `docs/meta-api-experiments.md`, the existing discovery brief in `prompts/`, and the actual repository before making changes. Treat the codebase as authoritative for implemented behavior. The landing-page curator is a simulated UI, not a working backend.

## Product decisions

- A real, external Callivember organizer should be able to use Grafeat. Do not hardcode the founder as the only account.
- Support **multiple isolated organizer workspaces**, initially with one user per workspace. Multi-member teams are out of scope.
- Provide email and Google **Grafeat sign-in**. Distinguish sign-in from **connecting Instagram/Facebook accounts** for Meta API access. Instagram/Facebook as Grafeat identity sign-in methods can be deferred, but document the path to add them.
- Build billing infrastructure with Stripe subscriptions and a complimentary beta entitlement. **Do not require the first organizer to pay.** Billing need not block the November 1 core workflow.
- The immediate product outcome is real submission discovery, genuine mention verification, review/selection, and persistent state. Carousel generation/publishing may follow once the organizer's biggest bottleneck is validated.
- No participant OAuth, no multi-user team management, no broad refactoring of the landing-page demo.

## Preferred architecture (validate before installation)

1. Existing Next.js 15 / TypeScript / Vercel.
2. Neon PostgreSQL + Drizzle ORM, with reviewable migrations.
3. Evaluate Better Auth for email magic-link or passwordless sign-in and Google OAuth. Check exact Next.js compatibility, session handling, email delivery, account linking, and operational overhead; offer an alternative if justified.
4. Model `User`, `Workspace`, `Membership` (or an equivalent minimal relation), `MetaConnection`, `Challenge`, `Submission`, `SyncRun`/`SyncLease`, and Stripe billing entities as needed. Avoid nullable organizer ownership; use non-null workspace foreign keys and enforce isolation on every server query.
5. Encrypt Meta tokens at rest using server-side managed keys; never log tokens or expose them to the browser. Scope credentials by workspace and Meta connection, and preserve both Facebook Login and Instagram Login identity namespaces. Plan a safe migration from the existing env-var credential workflow without breaking proven OAuth callbacks.
6. Vercel Cron for scheduling, with a secured invocation endpoint, bounded processing, overlap rescans, retry/backoff, resumable state, and **atomic** DB-backed leases. Check plan-specific cron frequency and function execution limits before committing to the design.
7. Vitest for service/unit/integration tests with injected mocked Meta fetch; no live Meta calls in CI. Add at least one smoke-test path for organizer onboarding and the real review flow.
8. Stripe: workspace-to-customer mapping, subscription status/entitlements, webhook signature verification, idempotent event processing, and beta grants. Keep billing separate from the core submission pipeline.

## Meta API invariants and unknowns

- Hashtag lookup: `/ig_hashtag_search?user_id={organizer_ig_id}&q={hashtag}`. Cache the returned hashtag ID; Meta documents a quota of 30 unique hashtags per IG User per rolling seven days (verify current documentation and exact applicability).
- Discovery: `/{hashtag_id}/recent_media?user_id={organizer_ig_id}&fields=id,caption,permalink,timestamp&limit=50` with cursor pagination. Do not assume strictly ordered timestamps or complete historical coverage.
- Genuine mention check: `/{organizer_ig_id}?fields=mentioned_media.media_id({candidate_media_id}){id,username,caption}`. Do not treat caption text as proof of a mention.
- Handle `pending`, `verified`, `not_verified`, and transient `error` distinctly. Failure to verify is **not** evidence of no mention.
- Upsert by challenge + media ID, preserve organizer review decisions across rescans, and handle date eligibility independently from mention status.
- **External-customer Meta permissions/Advanced Access remain unconfirmed.** Make verifying the invited organizer's actual account access a launch-blocking gate, with a clear fallback if Meta does not permit production discovery. Do not claim app-review approval from successful developer-account tests.
- Confirm whether API fields required for preview images are accessible and durable; never assume Instagram media URLs can be stored/reused indefinitely.

## Security and data handling

- Authorize every workspace/challenge/submission operation server-side. Never trust client-supplied workspace IDs without session membership checks.
- Use CSRF-safe OAuth callbacks, encrypted credentials, safe cookie settings, restricted cron access, rate limits, and non-sensitive logs.
- Respect Meta platform rules, artist rights, attribution, and data retention requirements. Do not add an artwork watermark by default.
- Add structured logging and useful sync observability without secrets.

## Delivery plan and approval gates

### Gate 0 — Architecture confirmation (before code)
Inspect repository and produce: schema sketch, auth-provider comparison, OAuth token migration plan, Meta permission checklist, billing entitlement design, Vercel execution-limit check, and implementation phases with estimates and risks. **Do not modify files or install packages until approval.**

### Slice A — Accounts and persistence
Migrations, email/Google login, isolated workspace, safe Meta connections, basic authenticated challenge setup. Test that two independent users cannot access each other's resources.

### Slice B — Real discovery and review
Cached hashtag lookup, bounded pagination, durable candidate records, mention verification, eligibility filtering, retry/recovery, and real review/selection UI. Validate with actual organizer permissions. Aim for usability by November 1; dates are targets, not guarantees.

### Slice C — Operations and billing
Scheduled sync, monitoring and failure recovery, Stripe customer/subscription + complimentary beta, production security and smoke tests. Implement essential scheduling before launch; billing can follow immediately if critical path is tight.

### Slice D — Callivember workflow and growth
Prioritize carousel composition/credit export based on organizer feedback. Later: optional caption attribution, co-branded launch post, shareable showcase, approved case study. Never watermark artists' original work by default.

## First response requested from Claude Code

1. Confirm what the repo already implements and any discrepancy with this brief.
2. Recommend the exact minimal schema and auth architecture, including how Meta identities link to a workspace.
3. Identify critical-path blockers to onboarding the Callivember organizer before November 1.
4. Provide a small, ordered implementation plan with dependencies, acceptance criteria, rollback considerations, and explicit approval checkpoints.
5. Highlight any recommendation you disagree with and explain why.

**Stop after the architecture/plan. Await approval before editing code, installing dependencies, creating migrations, or committing.**
