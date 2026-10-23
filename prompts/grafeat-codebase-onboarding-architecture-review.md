# Grafeat — Codebase Onboarding & Architecture Review

You are taking over development of **Grafeat**, an existing SaaS application for Instagram art-challenge organizers.

You are joining an established project with existing architecture, integrations, database models, UI components, and partially implemented functionality.

**Your first task is to understand the project thoroughly — NOT to implement anything.**

## Phase 1 — Repository reconnaissance

Inspect the repository systematically.

Start with:

- `CLAUDE.md` and any nested project instructions
- `HANDOVER.md`, if present
- `README.md` and existing documentation
- `package.json` and dependency configuration
- Next.js application structure and routing
- TypeScript configuration
- Database schema, migrations, and ORM
- Authentication and authorization
- Meta/Facebook/Instagram integrations
- Webhook handlers
- Background jobs, cron tasks, and queues
- Existing challenge and submission functionality
- UI components, design system, and application state
- Tests and deployment configuration

Use the actual repository as your primary source of truth for implementation status. Treat handover documents as important context and decisions, but verify their claims against the code.

Do not assume a technology, library, or architectural pattern exists simply because it is common in Next.js applications.

## Phase 2 — Architecture analysis

Build an accurate mental model of the application.

Identify:

1. **Application architecture:** Major modules, their responsibilities, and dependencies.
2. **Data architecture:** Main entities, relationships, persistence, and migration patterns.
3. **Authentication:** User identity, connected Instagram accounts, Meta tokens, and access boundaries.
4. **Instagram integration:** Existing API clients, OAuth flow, permissions, webhooks, and media processing.
5. **Challenge lifecycle:** How challenges are created, configured, stored, and managed.
6. **Submission lifecycle:** Any existing discovery, validation, review, selection, or publishing logic.
7. **Background processing:** Scheduling, retries, rate limiting, and error recovery.
8. **Frontend architecture:** Existing pages, reusable components, and UI conventions.
9. **Operational architecture:** Environment configuration, deployment, logging, and monitoring.

Trace relevant functionality through the actual code, rather than relying only on filenames or documentation.

## Phase 3 — Existing implementation assessment

Identify:

- What is already implemented and working
- What is partially implemented
- What is missing
- What is documented but not implemented
- What appears unused, duplicated, or obsolete
- Important technical debt or architectural risks

Pay particular attention to Instagram submission discovery and organizer workflows.

Do not propose refactoring merely because a different architecture might be preferable.

## Phase 4 — Produce an onboarding report

Before making any changes, provide a structured report containing:

### A. Architecture overview

A concise explanation of how Grafeat works, including the principal modules and data flows.

### B. Repository map

A table of important directories and files, with their responsibilities. Include actual file paths.

### C. Current feature inventory

Classify relevant features as:

- Implemented
- Partially implemented
- Missing
- Uncertain / requires verification

Distinguish verified implementation from assumptions.

### D. Instagram integration map

Explain the current integration end to end:

- Meta authentication
- Connected Instagram accounts
- Token storage and refresh
- API requests
- Webhook processing
- Challenge-related Instagram functionality

Identify the relevant functions, services, routes, and database models.

### E. Development conventions

Summarize the conventions you should follow when implementing new functionality.

### F. Risks and unknowns

Identify architectural risks, missing information, and questions that must be resolved before development.

### G. Recommended next steps

Suggest a short, prioritized sequence for continuing development. Do not implement these steps yet.

## Constraints

**READ-ONLY ONBOARDING.**

- Do not modify source files.
- Do not create migrations.
- Do not install or update dependencies.
- Do not run destructive commands.
- Do not alter database records.
- Do not deploy.
- Do not make live Meta API requests.
- Do not expose or print secrets.
- Do not make commits.
- Do not start implementing new features.

You may run safe, read-only repository inspection commands.

When making claims about the architecture, reference specific files, functions, or code locations.

If something cannot be established from the repository, explicitly mark it as unknown.

## Final instruction

Your objective is to become a well-informed maintainer of Grafeat, capable of continuing development without duplicating existing functionality or violating established architectural conventions.

**Stop after presenting the onboarding report and wait for my approval.**
