We are turning this repository into the production codebase for **Grafeat**.

## Context

This repository was copied from our `challenge-curator-instagram-spike` repo.

The existing code contains working/researched Instagram/Meta API functionality that we MUST preserve. It was deliberately built as an API feasibility spike and includes:

- Instagram Login OAuth
- Facebook Login OAuth
- webhook endpoint/configuration
- native tagged-media discovery via `/tags`
- `mentioned_media` lookup
- hashtag-search experiment
- publishing/API experiments
- diagnostic UI/routes
- research documentation and test results

Do not assume all spike code belongs in the eventual production application, but do not delete or rewrite working API functionality casually.

The repository is now the permanent product repo:

**Product:** Grafeat  
**Domain:** `grafeat.com`

---

## New design source

In the repository root there is:

`Grafeat prototype.zip`

This is the final Claude Design export.

It contains at least:

- `Landing Page.dc.html`
- `Challenge Curator.dc.html`
- `Design Notes.dc.html`
- `support.js`
- design briefs

The Claude Design prototype is now the **visual/product-design source of truth**.

The current application code is the **Instagram/API implementation source of truth**.

We need to merge these two carefully.

---

# Your task now: INSPECT AND PLAN ONLY

Do **not modify any files yet**.

Do not install packages.

Do not change Git configuration.

Do not change environment variables.

Do not deploy anything.

Do not attempt to “improve” or redesign the Claude Design output.

Do not start converting the prototype yet.

First inspect:

1. the existing repository structure;
2. `package.json` and current framework/dependencies;
3. existing routes and API routes;
4. existing Meta/Instagram functionality;
5. environment-variable usage;
6. the contents and structure of `Grafeat prototype.zip`;
7. `Landing Page.dc.html`;
8. `Challenge Curator.dc.html`;
9. `Design Notes.dc.html`;
10. `support.js`;
11. the design briefs included in the archive.

---

# Important product distinction

There are two different UI surfaces in the export.

### Public marketing site

`Landing Page.dc.html`

This should eventually become the real public Grafeat landing page at:

`/`

### Product application prototype

`Challenge Curator.dc.html`

This represents the intended authenticated Grafeat product UX:

**Curate → Compose → Publish → Settings**

It is currently a design prototype, not necessarily production application logic.

Do not blindly paste this HTML into the app.

We will later reproduce the design faithfully using the existing Next.js application architecture and connect it incrementally to real functionality.

---

# Branding

The permanent product name is:

**Grafeat**

The permanent domain is:

**grafeat.com**

The old names:

- Challenge Curator
- Challenge Curator Spike

are legacy working names.

However, do NOT perform a global search-and-replace yet.

Some old names may appropriately remain in:

- research documentation;
- historical experiment notes;
- test fixtures;
- commit/history context.

We only need production-facing naming migrated eventually.

---

# Preserve the spike evidence

The existing spike contains valuable empirical findings.

Do not remove or rewrite:

- test results;
- Meta setup documentation;
- API investigation notes;
- fixtures;
- experimental routes;

until we deliberately decide how they should be organized.

Some diagnostic functionality may later be moved behind development-only routes or otherwise isolated from production, but make no such change yet.

---

# What I want back

Give me a concise **merge assessment**, containing:

## 1. Current architecture

Summarize the existing Grafeat/spike repo:

- framework/version;
- routing structure;
- major UI routes;
- API routes;
- Meta integration modules;
- relevant dependencies;
- environment variables;
- deployment assumptions.

## 2. Claude Design export

Explain how each important exported file works:

- Landing Page
- product prototype
- Design Notes
- support.js
- other relevant assets

Identify whether the `.dc.html` files are:

- ordinary standalone HTML;
- generated React/application bundles;
- dependent on `support.js`;
- dependent on external resources;
- or something else.

## 3. Collision analysis

Identify where integrating the design would collide with existing code.

Especially check:

- `/`
- layouts
- global CSS
- fonts
- API routes
- authentication routes
- webhook routes
- environment variables
- static assets

## 4. What should be preserved unchanged

List the existing pieces that should initially remain untouched because they already work or contain valuable evidence.

## 5. Proposed target structure

Recommend how the permanent Grafeat repo should be organized after integration.

Keep it pragmatic for an early SaaS. Do not over-engineer it.

I expect something conceptually like:

public marketing site
+
Grafeat application UI
+
Meta integration/API
+
temporary diagnostic/API-lab functionality

but inspect the actual code before proposing exact routes/folders.

## 6. Integration sequence

Give me the safest incremental sequence for merging the Claude Design export.

I want small verifiable stages rather than a large rewrite.

For example, determine whether we should first:

- integrate only the LP;
- establish shared typography/design tokens;
- then migrate product screens;
- then connect real API functionality;
- then isolate/remove diagnostic UI;

or whether the actual repository suggests a better order.

## 7. Risks/questions

Call out anything that needs my decision before implementation.

---

# Critical constraints

For this response:

**NO CODE CHANGES.**

I want analysis and a merge plan only.

Do not start implementation even if the path seems obvious.

Keep the report practical and reasonably concise. I will review it and then authorize the first implementation stage separately.