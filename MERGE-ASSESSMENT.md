# Grafeat Merge Assessment

Analysis produced from `prompts/LP-DESIGN-INIT.md` — inspection and planning only, no code changed.

## 1. Current architecture

- **Framework:** Next.js 15 (App Router), React 18, TypeScript 5, strict mode. No UI library, no CSS framework, no state manager — package.json has only `next`/`react`/`react-dom` as deps. `next.config.mjs` is empty defaults.
- **Routing (UI):** `app/page.tsx` (plain-HTML diagnostic index, inline monospace styles, labeled "Not a product UI"), `app/privacy`, `app/terms`, `app/data-deletion` (Meta publication-requirement pages). No `globals.css`, no shared layout beyond `app/layout.tsx` (monospace body, 720px max-width — itself diagnostic-styled, not product-styled).
- **API routes:** all under `app/api/`, Node runtime, all `GET` handlers:
  - `api/auth/instagram/{start,callback}` — Instagram API w/ Instagram Login OAuth
  - `api/auth/facebook/{start,callback}` — Facebook Login + Graph API OAuth (legacy path, config_id-based)
  - `api/webhooks/instagram` — Meta webhook verify handshake + delivery
  - `api/discovery/{poll,mentioned-media,hashtag-search}` — three discrimination probes for submission discovery (native tags, mentioned_media lookup, hashtag search)
- **Meta integration:** two parallel, independently-working OAuth flows against Graph API v21.0, token exchange, permission introspection, Page/Business/IG-account resolution, webhook verify+receive, and three discovery-mechanism experiments. All instrumented via `lib/logger.ts` (`logEvent`/`saveFixture`, with secret redaction).
- **Env vars:** `BASE_URL`, `INSTAGRAM_APP_ID/SECRET`, `FACEBOOK_APP_ID/SECRET`, `WEBHOOK_VERIFY_TOKEN`, `ORGANIZER_IG_USER_ID/ACCESS_TOKEN`, `FACEBOOK_ORGANIZER_IG_USER_ID/ACCESS_TOKEN`, `DIAGNOSTIC_REVEAL_TOKENS`. `.env.local` is gitignored and currently holds real `WEBHOOK_VERIFY_TOKEN`/`FACEBOOK_APP_SECRET` values locally — fine, not committed.
- **Deployment assumption:** Vercel, with the explicit caveat that its filesystem is read-only in production (fixtures/log-file writes are best-effort local-only; console/Vercel logs are the production source of truth).
- **Findings status (per `DECISION.md`/`SPIKE-RESULTS.md`):** Only Sections 1 (auth) and 3 (discovery) of the spike plan are executed. Both OAuth paths authenticate; discovery is still largely blocked by Standard-vs-Advanced-Access restrictions (native `/tags` works, caption-mention webhooks and hashtag search don't yet). This is live, unresolved research — not just historical record.

## 2. Claude Design export

The zip is a **Claude Design (Artifacts "dc") export**, not plain HTML and not a compiled React app bundle:

- `Landing Page.dc.html`, `Challenge Curator.dc.html` — each is a `<x-dc>` custom-element document: a `<helmet>` (fonts/global CSS), an HTML template using custom control-flow tags (`sc-if`, `sc-for`) and `{{ }}` interpolation, plus a `<script type="text/x-dc" data-dc-script>` containing a `class Component extends DCLogic { renderVals() {...} }` — i.e. one logic class per file driving template bindings (state, handlers, computed view-model). This is the Claude Design runtime's own component model, **not JSX/React source**.
- `support.js` — explicitly header-commented `"GENERATED from dc-runtime/src/*.ts — do not edit."` It's the ~1900-line runtime (`dc-runtime`) that parses the `<x-dc>` template + script out of the `.dc.html` file, builds a `StreamableComponent`/`DCLogic` wrapper around React, and interprets `sc-if`/`sc-for`/`{{ }}` against the logic class's `renderVals()`. **Both `.dc.html` files depend on it** (`<script src="./support.js">`) and on `window.React`/`window.ReactDOM` being present (loaded elsewhere, not inside these files) — so the prototypes are not standalone without a host page that also loads React/ReactDOM.
- `Design Notes.dc.html` — same format, used as a readable internal changelog/rationale doc (refinement 2: what changed, open questions, intended Next.js IA), not a UI surface to port.
- `uploads/CHALLENGE-CURATOR-DESIGN-BRIEF.md` + `...-REFINEMENT-2.md` — the product/design briefs given to Claude Design: product premise, validation goals, IA (Curate→Compose→Publish→Settings), and refinement notes (remove "Need your call" state, lighter verification wording, hashtag-template settings, etc.).
- `.thumbnail` — binary preview image, not relevant to integration.

**Conclusion:** these are Claude's own prototyping-tool artifacts — closer to an executable spec/mockup than importable source. Design Notes itself already recommends "Building it in Next.js" with one client component + one reducer, which lines up with a plan to faithfully re-implement rather than embed the `.dc.html` runtime in production.

## 3. Collision analysis

| Area | Collision risk | Detail |
|---|---|---|
| `/` | **High** | `app/page.tsx` currently serves the diagnostic index at `/`. The LP must take over `/`; the diagnostic page needs a new home (e.g. `/dev` or similar) before/as part of LP integration. |
| Layout/root HTML | **Medium** | `app/layout.tsx` hardcodes monospace body styling and a 720px diagnostic-oriented shell — incompatible with the LP/product's actual design (serif/sans pairing, full-bleed sections, `#F4F1EA` background). Needs to become design-neutral or route-group-specific. |
| Global CSS / fonts | **Medium** | No existing `globals.css`/font setup to collide with — a clean slate. But the LP and Challenge Curator prototypes pull *different but overlapping* Google Fonts sets (LP: Albert Sans + Instrument Serif; Curator: those plus Bagel Fat One, Bodoni Moda, Pinyon Script) — worth consolidating/confirming which are actually load-bearing for V1 vs. decorative/unused before wiring `next/font`. |
| API routes | **None expected** | New marketing/product UI routes don't overlap `app/api/*` paths. |
| Auth/webhook routes | **None expected, but environment coupling** | `BASE_URL`-dependent redirect URIs and the webhook callback URL are registered in the live Meta App Dashboard — any domain/path restructuring must not silently change these without updating Meta config in lockstep. |
| Env vars | **Low** | New design files add no env vars; just confirm no naming collisions as real product config gets added later (e.g. a future `NEXT_PUBLIC_*` analytics key). |
| Static assets | **Low** | No `public/` dir currently exists in the repo tree. Fonts are all Google Fonts CDN links in both prototypes — no local asset collisions, but no optimization either (worth moving to `next/font` eventually, not now). |

## 4. What should be preserved unchanged (for now)

- All of `app/api/**` (auth, webhooks, discovery) — working, empirically-validated integration code mid-investigation.
- `lib/logger.ts` — redaction + logging utility used throughout the API layer.
- `fixtures/`, `research_notes/`, `reports/`, `SPIKE-RESULTS.md`, `DECISION.md`, `META-SETUP.md` — the empirical record; `DECISION.md` is explicitly a living doc tracking *unresolved* questions, not a closed-out archive.
- `app/privacy`, `app/terms`, `app/data-deletion` — required for Meta app review; keep functioning at stable URLs regardless of where `/` ends up pointing.
- `app/page.tsx` content/behavior — just needs relocation, not rewriting, once the LP claims `/`.
- `package.json`/`tsconfig.json`/`next.config.mjs` — no reason to touch yet; the design integration needs no new dependencies beyond `next/font` (already built into Next 15).

## 5. Proposed target structure

Pragmatic, no premature route-grouping machinery:

```
app/
  page.tsx                 → new: public landing page (from Landing Page.dc.html, hand-ported)
  layout.tsx               → becomes the real root layout (fonts, base styles)
  (dashboard or app)/      → later: authenticated product UI (Curate/Compose/Publish/Settings),
                              built incrementally against Challenge Curator.dc.html as the visual spec
  dev/                      → relocated diagnostic/API-lab page (former app/page.tsx content)
  privacy/, terms/, data-deletion/   → unchanged
  api/
    auth/, webhooks/, discovery/     → unchanged
lib/
  logger.ts                → unchanged
  (new) design tokens/shared UI primitives, added only once the product UI build starts
```

Nothing here demands route groups, a design-system package, or a monorepo split at this stage — nest the authenticated product surface under one folder when that work actually starts, informed by what the Curator prototype's component boundaries turn out to need.

## 6. Integration sequence

Recommended order, smallest safe increments first:

1. **Relocate the diagnostic page** off `/` to `/dev` (or similar) — trivial, decouples LP work from the spike tooling immediately. Confirm nothing in Meta's app dashboard or `META-SETUP.md` references `/` itself (it doesn't — only `/privacy`, `/data-deletion`, `/terms`, the webhook path, and OAuth callback paths are registered).
2. **Establish shared typography/tokens** in `layout.tsx` + a real `globals.css`/`next/font` setup, derived from the LP's actual used styles (`#F4F1EA` background, Albert Sans + Instrument Serif, the established color tokens like `#1D1C18`/`#5C6127`). Do this before building the LP so the LP isn't hand-rolling inline styles that get thrown away.
3. **Hand-port the Landing Page** to `app/page.tsx` as real JSX/Tailwind-or-CSS (not the `.dc.html`/`support.js` runtime), preserving the copy, layout, and interactive demo behavior but as ordinary React. This is the highest-value, lowest-risk increment — it's static/marketing, no auth or API coupling.
4. **Only after the LP is live**, begin incrementally reproducing the Challenge Curator UX (Curate→Compose→Publish→Settings) as real Next.js screens, initially with **mocked/fixture data** (the prototype's own 184-submission fixture concept is a reasonable starting point), not wired to live Graph API calls yet — because discovery mechanics are still unresolved per `DECISION.md`.
5. **Wire real API functionality in afterward**, screen by screen, once each screen's data needs are clear and once outstanding discovery questions (Q2–Q4 in `DECISION.md`) are resolved enough to commit to a data model.
6. **Isolate/remove diagnostic UI last** — once `/dev` is no longer needed for active testing, decide whether to gate it behind a dev-only flag or delete it; not urgent.

This order matches Design Notes' own recommendation ("Building it in Next.js... one client component, one reducer") and avoids blocking marketing-site shipping on unresolved API research.

## 7. Risks / questions needing a decision

1. **Scope of this pass:** literal 1:1 fidelity to `Landing Page.dc.html` (colors/copy/animations as-is), or should stale copy be corrected during the port? `readme.md` already contains pasted feedback suggesting changes (drop "Ten steps, thirty-one times," rename "Name" → "Hashtag base" in Settings, remove the unvalidated Reel-audio-removal claim) that looks like it predates this repo move and may need to be applied during the port rather than treated as a separate pass.
2. **Fonts:** Challenge Curator pulls 3 extra display fonts (Bagel Fat One, Bodoni Moda, Pinyon Script) not used in the LP — confirm whether these are load-bearing for V1 Curator screens or decorative artifacts from exploration, before committing to loading them.
3. **Diagnostic page fate:** confirm `/dev` (or a preferred path) as the new home before moving it — and whether it should eventually be excluded from production builds entirely or just unlinked.
4. **Product data model timing:** the Curator prototype assumes a settled data shape (submissions, verification-per-creator, hashtag templates, calendar) that the live spike hasn't fully validated yet (Sections 4–22 of the original spike brief are still pending). Building Curator screens against fixtures risks a reshape once real discovery/metadata behavior is confirmed — acceptable tradeoff, but worth an explicit sign-off.
5. **`DIAGNOSTIC_REVEAL_TOKENS` and raw-token-revealing diagnostic behavior** in the auth callbacks is fine for spike use but should be explicitly flagged as something to lock down (or remove) before this becomes a real multi-user product — not urgent now, just noting it so it doesn't get forgotten.

## Recommendation

No files were modified as part of producing this assessment. Suggested first authorized stage: **Stage 1 (relocate diagnostic page) + Stage 2 (typography/tokens)** together, since they're low-risk and unblock the LP port.

---

## Stage 1 report — relocate diagnostic homepage to /dev

**Build/type checks:** `npx tsc --noEmit` — clean, no errors. `npm run build` — compiled successfully, all 14 routes generated including the new `/dev`.

**Files changed:**
- `app/page.tsx` — modified: replaced diagnostic content with a minimal `Grafeat` placeholder (no styling).
- `app/dev/page.tsx` — new: contains the diagnostic page, byte-for-byte unchanged content and behavior (same env var checks, same auth/discovery links, same legal-page links).

**`/dev` confirmation:** `app/dev/page.tsx` is an exact copy of the former `app/page.tsx` body — same `DiagnosticPage` component, same env var list, same links to `/api/auth/*`, `/api/discovery/*`, and the legal pages. Build output lists `/dev` as a static route alongside the others.

**Untouched, confirmed via `git diff --stat`:**
- Nothing under `app/api/**` changed.
- `app/privacy`, `app/terms`, `app/data-deletion` — not touched.
- No env vars, no `app/layout.tsx`, no global CSS/fonts, no `Grafeat prototype.zip`, no research/docs files.

Only `app/page.tsx` (modified) and `app/dev/page.tsx` (new) changed.

---

## Stage 2 report — global Grafeat design foundation

**Build/type checks:** `npx tsc --noEmit` — clean, no errors. `npm run build` — compiled successfully; all 14 routes generated, including `/`, `/dev`, and both fonts (Albert Sans, Instrument Serif) fetched and self-hosted by `next/font/google` with fallback metrics.

**Files changed/created:**
- Modified: `app/layout.tsx` — now loads both fonts via `next/font/google`, imports `./globals.css`, sets production metadata.
- Modified: `app/page.tsx` — placeholder `h1` now references `var(--font-serif)` so both fonts are visibly verifiable.
- New: `app/globals.css` — design tokens + base reset.
- New: `app/dev/layout.tsx` — isolation wrapper for `/dev`.
- New: `app/dev/dev.module.css` — isolation styles for `/dev`.
- (`app/dev/page.tsx` itself, created in Stage 1, is untouched.)

**Design tokens extracted** (from `Landing Page.dc.html`'s `<style>` block + inline styles — verified by hex-color/property frequency audit, not guessed):

- **Background/paper:** `--color-paper: #F4F1EA` (body background)
- **Ink/text:** `--color-ink: #1D1C18` (primary text/headings), `--color-ink-dark: #1F2118` (inverse/dark section bg), `--color-text: #3E3B33` (body copy), `--color-text-muted: #5E5A50` (eyebrow labels), `--color-text-on-dark: #D9D5C8`, `--color-text-faint: #B9B5A8` (fine print)
- **Olive/accent:** `--color-olive: #5C6127` (links, CTA highlight), `--color-olive-light: #B9BC8E` (olive accent on dark sections)
- **Muted/border:** `--color-border: #E2DDD1` (hairline), `--color-border-strong: #CFC9BB` (card/button borders)
- **Typography:** `--font-sans` → Albert Sans (weights 400/500/600/700, matching the LP's Google Fonts request) for body/UI; `--font-serif` → Instrument Serif (normal+italic, weight 400 only — that's all Google Fonts offers for it) for display/editorial, matching the LP's `font-family:'Instrument Serif',serif` usage on headlines. Base body: 16px / line-height 1.5, color = ink, background = paper — taken verbatim from the LP's wrapper div.
- **Radius/spacing** (only values reused across multiple elements, not one-offs): `--radius-sm: 6px` (buttons), `--radius-md: 10px` (cards), `--radius-full: 999px` (pills), `--container-max: 1280px` (primary content width, used 8× in the LP).

Deliberately deferred to Stage 3 (section-specific, not global): badge-only colors `#EAE6DC`, `#E6E6D0`, `#3A3D16`, `#E9B79E`, card background `#FBFAF6`, stat-label color `#6F6A5E`, and one-off radii (4px, 8px, 50%).

**`/dev` isolation:** Root layout now sets `body { background, color, font-family }` and a bare `a { color }` rule — both would otherwise cascade into `/dev` since it shares the same `<body>`. To prevent that, `/dev` got its own nested layout (`app/dev/layout.tsx`) that wraps its unmodified page in a `.diagnostic` wrapper (`dev.module.css`) which explicitly re-declares the original look (`font-family: monospace`, `padding: 2rem`, `max-width: 720px`, white background, black text) and reverts anchor color back to the browser default (`color: revert`) to cancel the new global link styling. `app/dev/page.tsx` itself was not touched — only wrapped.

**Confirmation:** `git diff --stat` / `git status` show no changes under `app/api/**`, `app/privacy`, `app/terms`, `app/data-deletion`, `.env*`, or the `Grafeat prototype.zip` export — only `app/layout.tsx`, `app/page.tsx` (modified) and `app/globals.css`, `app/dev/layout.tsx`, `app/dev/dev.module.css` (new) changed.

Stopped after Stage 2 — no landing-page porting has begun.

---

## Stage 3 report — port the Grafeat landing page to /

### Scope conflict found and resolved before implementation

The LP's "LIVE DEMO" section doesn't contain its own demo markup — it embeds the entire Challenge Curator component directly (`<dc-import name="Challenge Curator" on-published="..." on-cta="..." on-time-answer="...">`). `Challenge Curator.dc.html` is ~1,100 lines implementing the full Curate → Compose → Publish → Settings product. This directly collided with the instruction not to begin porting Challenge Curator yet. Flagged to the user; resolved as a **scoped interactive simulation**: a small, self-contained curate → compose → publish flow built from Grafeat's own Stage 2 tokens (not Challenge Curator's distinct styling), wired to the same three signals the LP depends on (`demoDone`, `timeAnswer`, `toForm`/CTA-to-signup). Full product fidelity (verification persistence, real drag/reorder, settings, duplicate-challenge, API/OAuth) is explicitly deferred to the later Challenge Curator stage, per the user's direction.

### Files created

All new, under `app/landing/`:
- `content.ts` — ritual/pillars/carry/faqs copy transcribed verbatim from the export's `renderVals()`, plus the time-quiz options and frequency options.
- `miniDemoData.ts` — placeholder submission fixture (handles + color swatches) for the scoped demo.
- `DemoContext.tsx` (client) — the shared state the LP's single Logic class held (`expanded`, `demoDone`, `timeAnswer`, `frameRef`, `formRef`, `expand`/`collapse`/`toForm`), exposed via React context so only the sections that need it become client components.
- `Header.tsx` / `.module.css`, `Hero.tsx` / `.module.css`, `RitualSection.tsx` / `.module.css`, `PillarsSection.tsx` / `.module.css`, `DuplicateSection.tsx` / `.module.css`, `FaqSection.tsx` / `.module.css`, `Footer.tsx` / `.module.css` — server components, one per static LP section, no client JS.
- `DemoSection.tsx` / `.module.css` (client) — the demo's header/frame/full-screen toggle/caption, straight from the export.
- `MiniDemo.tsx` / `.module.css` (client) — the scoped curate/compose/publish simulation that lives inside the demo frame.
- `EarlyAccessSection.tsx` / `.module.css` (client) — the signup form, reading `timeAnswer`/`formRef` from context, owning its own local form state.

### Files modified
- `app/page.tsx` — now composes the sections above (`Header`, `Hero`, `LandingDemoProvider` wrapping `DemoSection`/`RitualSection`/`PillarsSection`/`DuplicateSection`/`FaqSection`/`EarlyAccessSection`, `Footer`) instead of the placeholder.
- `app/globals.css` — added the LP's `@keyframes lpin` (hero entrance + signup "thank you" animation) and the section-specific tokens Stage 2 deliberately deferred: `--color-card-paper`, `--color-badge-neutral-bg`, `--color-badge-olive-bg`, `--color-badge-olive-text`, `--color-stat-muted`, `--color-error`.

### Verification run
- `npx tsc --noEmit` — clean.
- `npm run build` — compiled successfully; `/` is 6.62 kB page weight, 109 kB First Load JS (client JS is limited to the demo + signup form, per the "isolated client components" instruction).
- No headless-browser tooling is available in this environment (no `chromium-cli`, no Playwright installed), and installing one wasn't something I was asked to do, so I did not add it. Verification instead used: `npm run dev` + `curl` against the rendered HTML (confirmed full SSR output, all section class names present, sample demo data rendered, client components hydrate correctly, no Next.js error overlay markers), plus a manual audit of every `display:flex` row in the new CSS for wrap behavior at narrow widths. **I could not click through the live demo in an actual browser — recommend you run `npm run dev` and click through locally before treating Stage 3 as fully verified.** Happy to install Playwright for automated verification if you'd like that going forward — just say so.

### How the .dc.html interactions were translated to React
- `expand()`/`collapse()` (imperative inline-style mutation + body scroll lock + Escape listener) → `expanded` boolean in `DemoContext`, driving a conditional CSS class (`frameExpanded`) on the frame `<div>`; a `useEffect` keyed on `expanded` handles the body-overflow lock and the Escape-key listener with proper cleanup.
- `toForm()` (collapse if expanded, then scroll the form into view) → `DemoContext.toForm`, same two steps, using `scrollIntoView` instead of manual `getBoundingClientRect` math.
- `onPublished`/`onTimeAnswer` callbacks from the embedded Challenge Curator → `setDemoDone`/`setTimeAnswer` on `DemoContext`, now called from `MiniDemo`'s own publish/quiz handlers instead of a child dc-import.
- The LP's single `state = {...}` object and `renderVals()` → split along actual state ownership: cross-section state (`expanded`, `demoDone`, `timeAnswer`) in `DemoContext`; demo-internal state (selection, step, quiz-answered-locally) in `MiniDemo`; form state (`account`/`email`/`freq`/`pain`/`beta`/`submitted`/`error`) local to `EarlyAccessSection`, since nothing else on the page reads it.
- `sc-for`/`sc-if`/`{{ }}` template constructs → ordinary `.map()`, `&&`/ternary conditionals, and JSX expressions.

### Visual/behavioral differences from the source export
1. **Header gets `flex-wrap: wrap`** (nav row + outer header row). The source has no wrap there; at viewports below ~520px of nav content it would clip/overflow horizontally. Minimal, necessary fix per the "no unintended horizontal overflow" requirement.
2. **MiniDemo's internal top bar and action bar also got `flex-wrap: wrap`** (not present in source, which never specified this area at all — it's new surface). Same reasoning; contained within the demo frame's `overflow:hidden` either way, but wrapping looks cleaner on narrow viewports.
3. **One caption line rewritten out of necessity**: the source's "Also in the demo: Settings, and duplicating a challenge under the project name." is false for our scoped demo (it has neither). Changed to "Also in the full product: Settings, and duplicating a challenge under the project name." — keeps the same information, relocates the claim to where it's true.
4. **The demo's internal screens (curate grid / compose list / publish result) have no source to match** — they're the approved scoped simulation, styled with Grafeat's own tokens rather than Challenge Curator's distinct fonts (Bagel Fat One / Bodoni Moda / Pinyon Script), which Stage 2 explicitly excluded.
5. **Demo's logo (`Grafeat`) is a plain `<div>`, not a link** — matches source exactly (it was a `<div>` there too); flagging only because I initially coded it as a link before correcting it.
6. **Minor added affordance**: a "Run the demo again" link in the demo's done state, and keyboard support (`role="checkbox"`, Enter/Space) on the custom beta checkbox in the signup form. Neither exists in the source; both are small, non-visual, behavior-additive conveniences, not redesigns.
7. **Time-quiz option wording** ("Under 15 minutes" / "15–30 minutes" / "30–60 minutes" / "Over an hour" / "I don't feature daily") is my own construction — the export only confirms the exclusion value `"I don't feature daily"` and the downstream copy that consumes the answer; the actual quiz UI lives inside Challenge Curator, out of scope. The wiring (`timeAnswer` → `hasTime` → "by hand, a daily feature takes you ___") is exact.

### CTAs with intentionally unresolved destinations
- **"Get early access" submit** has no backend call — matches the source exactly (the original script only ever does `this.setState({ submitted: true })`, no `fetch`/POST anywhere). Real lead capture (email/DB/CRM) is not wired up yet; flagging because eventually it needs a destination, not because this stage introduced a gap.
- All other CTAs are same-page anchors (`#demo`, `#early-access`, `#how`, `#questions`) with unambiguous behavior — no other unresolved destinations.

### Confirmation
`git status`/`git diff --stat` show no changes under `app/api/**`, `app/privacy`, `app/terms`, `app/data-deletion`, `.env*`, `fixtures/`, `research_notes/`, or the `Grafeat prototype.zip` export. `Challenge Curator.dc.html` was read for research only, never ported. Only `app/page.tsx`, `app/globals.css` (modified) and the new `app/landing/` directory changed.

Stopped after Stage 3 — the standalone Challenge Curator product application has not been started.

---

## Stage 3 correction — faithful React port of Challenge Curator as the embedded LIVE DEMO

After browser review, the scoped MiniDemo simulation was rejected as too simplified. This correction replaces it with a faithful, line-for-line React/TypeScript port of `Challenge Curator.dc.html` (~635 lines of template + ~460 lines of logic), used as the LP's embedded demo exactly as the Claude Design source does (the LP imports the complete Challenge Curator component). Still front-end simulation only — no backend, no persistence beyond component state.

### 1. Files changed / created / deleted

**Deleted** (the rejected simplification):
- `app/landing/MiniDemo.tsx`, `app/landing/MiniDemo.module.css`, `app/landing/miniDemoData.ts`

**New** — `app/landing/curator/` (the ported product):
- `curatorData.ts` — `rng()`/`buildData()` ported exactly: seeded PRNG, the same named/generated-handle lists, the same 184-item generation algorithm, same "ready/missing/wrong" distribution, same shuffle-based display ordering, same previously-featured overrides, same 3 seed projects.
- `curatorArt.tsx` — `makeArt`/`makeArtInner` ported exactly: all 10 procedural art kinds (calligraphy, lettering, typography, stripes, dots, ink, arches, waves, collage, staff), same palettes, same CSS container-query (`cqw`) based scaling.
- `curatorFonts.ts` — Pinyon Script, Bagel Fat One, Bodoni Moda via `next/font/google`, scoped to this subtree only (not added to the site-wide font stack Stage 2 established — they're only used by this component's procedural artwork, exactly as Stage 2 anticipated).
- `curatorTypes.ts` — the state shape (`initCuratorState()`), ported field-for-field from the source's `state = {...}`.
- `useChallengeCurator.ts` — the single state/behavior hook: every handler (`toggle`, `removeSel`, `move`, `go`, `setView`, `publish`, `scrollToSec`, `resetDemo`, verification, audio-per-Reel, caption composition, duplicate-challenge, settings fields, prompts) and the full derived view model, ported from `renderVals()`.
- `CuratorHeader.tsx`, `TodayScreen.tsx`, `ComposeScreen.tsx`, `PublishScreen.tsx`, `DoneScreen.tsx`, `ProjectsScreen.tsx`, `SettingsScreen.tsx`, `DetailOverlay.tsx`, `DuplicateModal.tsx`, `ToastBubble.tsx` — one component per screen/overlay, each a close translation of its template section.
- `ChallengeCurator.tsx` — root component assembling the above, matching the source's root wrapper (`position:absolute;inset:0`, same background/font/overflow).
- `curator.module.css` — only what inline style objects can't express: the 3 `@keyframes` (ccflash/ccup/ccin) and the handful of hover/focus states the source declared via its `style-hover`/`style-focus` DC-runtime attributes.

**Modified:**
- `app/landing/DemoSection.tsx` — swapped `<MiniDemo />` for `<ChallengeCurator onPublished={setDemoDone} onCta={toForm} onTimeAnswer={setTimeAnswer} />`; the "Also in the demo: Settings, and duplicating a challenge..." caption line reverted to the source's original wording (now true — Settings and duplicate-challenge are both actually present).
- `app/globals.css` — added `select` to the existing `font-family: inherit` reset (the source's global stylesheet resets it too; Stage 2's version had missed `select`).

### 2. Challenge Curator states/interactions ported

- **Navigation:** Curate → Compose → Publish → Done, plus Projects (challenge list) and Settings, via the same step pills/locking logic (steps lock until at least one submission is selected).
- **Curate:** the 184-item deterministic sample set, Ready/Set-aside tabs, grid selection (tap to select, up to 10, toast when full), aside groups ("missing hashtag" / "posted outside window") with "Include anyway", detail lightbox with prev/next navigation and the same per-item rule checks.
- **Compose:** running-order list with drag-and-drop reorder (native HTML5 drag events, same as source) plus the ↑/↓/× controls, per-creator verification (Verify / Undo / Reset, remembering "verified previously" from seeded `featured` history), per-Reel audio Keep/Remove, the credits-follow-slide-order caption template with opening/credits/closing/hashtags fields, a "plain text" caption mode, and the same live caption-validity checks (required hashtags, credit coverage, 2,200-character limit).
- **Publish:** the approximate Instagram preview (carousel dots, caption collapse/expand), the same publish-readiness checklist, Publish-now vs. Schedule (with time picker), the unverified-creators warning that never blocks publishing, and the staged "Preparing slides → removing audio → uploading → posting/scheduling" progress sequence on a 750ms-per-step timer.
- **Done:** elapsed-time readout (measured from first interaction, exactly like the source's `this.start`), sample thumbnails, the manual-time micro-quiz (now the *actual* 5-option quiz from the source, not my earlier invented one), "Restart demo", and the `onCta`/`onPublished`/`onTimeAnswer` callbacks firing into the LP exactly as `<dc-import>` did.
- **Projects screen:** the 3 seeded challenges (active/draft/done), "Duplicate" opening the modal.
- **Duplicate modal:** proposed name (year auto-incremented), carry-over checklist with toggles, "Create draft" prepending a new draft project with a flash highlight — all in local state, nothing persisted.
- **Settings:** General (name/account/dates), Submission rules (mention/daily-hashtag toggles, hashtag-template fields with live-generated previews, allowed-media toggles, submission window), Calendar (31-day table, hashtag preview per day, optional per-day titles, collapsed to the days around Day 16 by default), Selection (static), Publishing (caption template, default Reel-audio mode), Participation & rights (disclaimer textarea) — with the sticky section nav scrolling to each section exactly like `scrollToSec`.

**Deliberately not ported** (confirmed dead code — computed in the source's `renderVals()` but never reached by the actual template): the "Needs" review state/tab (`decide()`, `needsItems`, `inNeeds` — `buildData()` never creates a `status:'needs'` item and the template has no `inNeeds` branch) and `missingOpts` (a Settings segmented control that's computed but never rendered). Omitting these isn't a fidelity loss — they don't exist in the shipped product either.

### 3. What couldn't be reproduced exactly / verified

- **No browser tooling in this environment** (no `chromium-cli`, no Playwright — same limitation as Stage 3's first pass, and I didn't install one without asking). I verified correctness via `tsc`/`npm run build`, and by running `npm run dev` + `curl`ing the rendered HTML to confirm the full 184-item dataset, all screens' markup, and the header/demo structure render server-side with no hydration-warning output in the dev server log. I could not personally click through drag-reorder, the publish timer, or the settings sticky-scroll in an actual browser — please smoke-test those interactions in `npm run dev` before considering this fully verified.
- **Pixel-exact match of the procedural artwork** to what the original Claude Design tool rendered wasn't independently diffed (no way to render the original `.dc.html` side-by-side here). The generation algorithm, constants, and call order were transcribed as closely as practical from the source, and the sample output I could inspect (handles, project names, art-kind distribution) matches expectations, but a visual pixel comparison is something only you can do by eye.
- **CSS container queries** (`container-type: inline-size`, `cqw` units) drive the art generator, same as the source — this requires a modern browser (Chrome 105+/Safari 16+/Firefox 110+). Not a new limitation; the original also depended on this.

### 4. How LP ↔ prototype events are wired

Unchanged shape from the prior pass, now pointed at the real component: `DemoSection` passes `DemoContext`'s `setDemoDone`/`toForm`/`setTimeAnswer` straight through as `ChallengeCurator`'s `onPublished`/`onCta`/`onTimeAnswer` props — the same three props the original `<dc-import>` wired up. `ChallengeCurator` calls them from the same places the source did: `onPublished` when the publish-progress sequence completes, `onTimeAnswer` when a Done-screen quiz pill is clicked, `onCta` from the Done screen's "Try it with your challenge →" button. The LP's "Full screen" toggle and its exit bar are untouched from the prior pass — they operate on the frame `<div>` around whichever demo component is inside it, so swapping MiniDemo for ChallengeCurator required no changes there.

### 5. Confirmation: MiniDemo removed
`app/landing/MiniDemo.tsx`, `app/landing/MiniDemo.module.css`, and `app/landing/miniDemoData.ts` are deleted. `grep -rn "MiniDemo" app/` returns nothing. There is exactly one demo implementation now.

### 6. Red debug-pill markers
I could not reproduce or directly inspect what you saw (no browser here), so I can't give a confirmed root-cause. What I can confirm: the new implementation's server-rendered HTML contains no error/hydration markers, and `npm run dev`'s server log is clean (no warnings) across repeated requests. My best explanation, offered for you to confirm visually: this is very likely Next.js's own dev-mode-only DevTools indicator and/or hydration-error markers that the prior MiniDemo implementation could have triggered — both are artifacts of `next dev` specifically and never appear in `next build`/production output, and the latter class of issue is now moot since MiniDemo (and its data flow) no longer exists. If the markers still appear with this version in your browser, that's a real bug I need to see to diagnose — screenshot or console output would help.

### 7. Confirmation: no real backend/API integration added
`git diff --stat` against `app/api/**`, Meta integration code, `.env*`, legal-page content, and `fixtures/`/`research_notes/` shows no changes. The ported Challenge Curator makes no network calls anywhere — publishing, verification, duplication, and settings are all local component state, matching the source's own "Demo only: nothing is posted to Instagram."

Stopped here per the correction's scope — no production `/app`, `/dashboard`, authentication, persistence, or API integration was added.
