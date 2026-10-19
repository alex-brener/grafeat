# DECISION.md

Answers to the 13 questions from `prompts/INSTAGRAM-API-SPIKE.md` Section 24, based strictly
on what's been empirically verified in `SPIKE-RESULTS.md` as of 2026-10-20. This spike has so
far only covered **Section 1 (Authentication)** and **Section 3 (Submission Discovery)**.
Sections 4–22 (metadata completeness beyond discovery, deterministic rules, global window,
image/carousel/Reel retrieval, video processing, carousel format, publishing, scheduling,
follower verification) have not been executed yet — those questions are marked explicitly
as not yet tested below, not guessed at.

## 1. Which Meta auth path should production use?

**Not yet fully decidable — both paths authenticate successfully, but the deciding factor
(discovery) is unresolved on both.** Instagram Login (1a) and Facebook Login (1b) both PASS
for authentication. Facebook Login requires a linked Facebook Page and a materially more
complex organizer consent flow (Page picker → Instagram-account picker → Business picker, vs.
Instagram Login's single "Continue as @handle" screen) — a real, permanent UX cost for
organizers, not just one-time setup friction. In exchange, Facebook Login's `mentioned_media`
retrieval edge is confirmed working; Instagram Login has no documented equivalent retrieval
edge for caption mentions at all. Neither path has a confirmed discovery *trigger* for pure
caption-only mentions (see Q2). **Recommendation pending Q2/Q4 resolution** — if no reliable
caption-mention trigger is found on either path, the auth-path choice may become secondary to
a product-level decision about discovery mechanics (see Q3).

## 2. What triggers ingestion?

**Unresolved — this is the central open problem of the spike so far.** Confirmed NOT to
trigger: a pure caption-only @mention does not deliver a webhook event on Instagram Login's
`comments` field (Test C, FAIL) or Facebook Login's dedicated `mentions` field (Test D, FAIL) —
tested under real, correctly-configured, Published-app conditions on both paths. Confirmed TO
trigger (eventually, mechanism not fully understood): a native "Tag people" tag becomes
discoverable via Instagram Login's `/tags` polling edge (Test A1, PASS) — though what
specifically caused the transition from empty to populated results (app Published status,
webhook configuration, or a propagation delay) was never isolated, since multiple candidate
changes happened close together.

## 3. Support @mentions, tags, or both?

**Current evidence points toward native tags being necessary, contradicting the product's
originally stated preferred model** ("@mention = discovery, hashtags = validation and day
assignment," `prompts/INSTAGRAM-API-SPIKE.md` Section 3). Native tags are the only mechanism
with a confirmed, working discovery path (via `/tags` polling). Caption-only mentions have no
confirmed discovery path on either login product as of this spike. This tension should be
surfaced to product decision-makers directly rather than resolved quietly — it may mean
requiring organizers to ask participants for both a caption mention (for credit/validation
text) and a native tag (for actual discovery), which changes the participation instructions
given to organizers.

## 4. Is polling/reconciliation required?

**Yes, provisionally required — webhook push is confirmed unreliable for the primary intended
signal (caption mention) on both login paths.** But polling itself only has a confirmed path
for native tags (`/tags`), not for caption-only mentions — there is no documented listing/search
edge for caption mentions under either login product; `mentioned_media` requires already
knowing a media ID, it cannot discover new ones. This means reconciliation polling, as currently
understood from the docs, does not by itself solve caption-only discovery either. Pagination
behavior of `/tags` was also never fully confirmed (no `paging` object was ever returned in any
response captured, despite Meta's docs describing cursor-based pagination for this edge) —
worth re-testing with an explicit `limit` parameter before relying on `/tags` for a potentially
large real history.

## 5. Which metadata is reliable?

**`mentioned_media` (Facebook Login): confirmed reliable** — `caption`, `media_type`,
`media_url`, `permalink`, `timestamp`, `username`, `comments_count`, `like_count`, `id` all
returned correctly and completely in a live test (Section 3.1). **`/tags` (Instagram Login):
confirmed reliable for the same field set**, for native-tagged media only. **One confirmed,
non-obvious reliability trap**: the Instagram account/user ID is **not portable** between the
two login products — Instagram Login and Facebook Login use two different numeric ID
namespaces for the same underlying Instagram account. A production implementation must store
and use the correct ID per auth path; using the wrong one produces a "does not exist" error
that looks like a permissions problem but isn't.

## 6. Which media can be imported?

**Not yet tested.** Image retrieval (Section 7), participant carousel retrieval (Section 8),
and the Reel experiments (Section 9) have not been run in this spike yet.

## 7. Exactly when are Reels unavailable?

**Not yet tested.** No Reel experiments (original audio / licensed audio / downloads-disabled)
have been run yet.

## 8. What happens to non-importable Reels?

**Not yet tested** — depends on Q7.

## 9. What output aspect ratio should V1 use?

**Not yet tested.** No carousel format experiments (Section 12) have been run yet.

## 10. Can mixed image/video carousels publish reliably?

**Not yet tested.** No publishing tests (Section 14, Carousel B) have been run yet.

## 11. Actual caption/carousel limits?

**Not yet tested.** No caption-constraint tests (Section 16) have been run yet. (The one
caption observed in this spike — the `#callivember` "Day 16" post retrieved via
`mentioned_media` — was well under the prototype's assumed 2,200-character limit, but that's
an incidental observation, not a test of the limit itself.)

## 12. Meta review/access requirements?

**Standard Access has been sufficient for everything tested so far** — no App Review or
Advanced Access gate was hit on either login path, consistent with testing only against
accounts/assets the app's own role-holder (Admin) owns and manages. However, this does **not**
mean setup was frictionless: significant *self-serve configuration* difficulty was encountered
on the Facebook Login path specifically — permissions not appearing in the expected picker
until routed through the correct guided setup flow, and a lengthy misdirection around which
Business Portfolio actually owned the test Page (see `SPIKE-RESULTS.md` Section 1b for the
full trail). This is operational/UX friction for whoever sets up the production app, not a
review/access blocker — worth distinguishing clearly in planning, since it's a one-time cost
for us as the developer, not a recurring cost for organizers (except the Page-linking step
itself, which organizers would need to do once per their own account — see Q1).

## 13. Any blocker to the MVP?

**One real, currently-unresolved blocker: no confirmed reliable discovery trigger for
pure caption-only mentions, on either auth path.** This directly threatens the product's
stated preferred participation mechanic. Per the spike's own Red-criteria ("participant
mentions cannot be reliably discovered" — `prompts/INSTAGRAM-API-SPIKE.md` Section 25), this
is trending toward Yellow/Red specifically for the caption-mention mechanic, **unless** one of
the following resolves it: (a) a caption mention combined with a native tag (the pattern real
`#callivember`-style posts already use) turns out to behave differently and reliably — not yet
tested; (b) a reconciliation-polling endpoint for caption mentions exists but hasn't been found
yet; or (c) the product accepts requiring native tagging as the primary discovery mechanic
instead of (or alongside) caption mentions — a real product-level decision, not just an
engineering workaround. All other tested capabilities (auth on both paths, Page/Instagram
linkage, metadata retrieval once a media ID is known) are solid. This is not yet a Red verdict
for the whole spike — it's a specific, isolated, well-characterized open question that the
next test should target directly.
