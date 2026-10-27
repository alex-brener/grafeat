# Grafeat — Handover

> **Superseded for Slice B topics (challenges, discovery, processing, sync) as of 2026-10-27 by `docs/HANDOVER.md`.** This file predates the database/schema entirely and is explicitly stale for that area — kept here unmodified otherwise, for its still-accurate pre-Slice-B history. See `docs/HANDOVER.md` for the current state and `docs/DECISIONS.md` for the agreed product/architecture decisions.

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
