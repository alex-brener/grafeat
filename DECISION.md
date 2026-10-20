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

**Unresolved — but narrower than it first appeared.** No webhook delivery was observed for a
pure caption-only @mention on either Instagram Login's `comments` field (Test C) or Facebook
Login's dedicated `mentions` field (Test D). **Revised interpretation (2026-10-20): this is no
confirmed DIRECT caption-mention discovery trigger under our current Standard Access
configuration — not a confirmed statement that the mechanism itself doesn't work.** Both tests
used deliberately non-role-holder participant accounts (correct per the spike brief's own
Section 2 instruction), and Meta's webhook access-level docs state that Standard Access only
delivers events triggered by people who have a role on the app — arbitrary public users require
Advanced Access (App Review). This is a credible, not-yet-fully-isolated alternative explanation
for the null result (see `SPIKE-RESULTS.md` Section 3.1). Confirmed TO trigger (eventually,
mechanism not fully understood): a native "Tag people" tag becomes discoverable via Instagram
Login's `/tags` polling edge (Test A1, PASS). **Test E (hashtag polling) was run and hit the
exact same class of restriction from a different angle**: `ig_hashtag_search` returned an
explicit, named rejection — *"To use 'Instagram Public Content Access', your use of this
endpoint must be reviewed and approved by Facebook"* — confirmed directly by Meta, not inferred.
This substantially strengthens the Standard/Advanced Access theory above: two different
features (webhook delivery, public content search), same underlying restriction class.

## 3. Support @mentions, tags, or both?

**Not yet decidable — current evidence shows native tags working, and both direct caption
mentions and hashtag-based polling blocked by access level, not by the mechanisms themselves.**
Native tags are the only mechanism with a confirmed, *currently usable* discovery path (via
`/tags` polling under Standard Access). Caption-only mentions (Tests C, D) and hashtag-based
polling (Test E) are both blocked — the former by apparent silent non-delivery consistent with
Standard Access restrictions, the latter by an explicit Meta-confirmed Advanced Access/App
Review gate on "Instagram Public Content Access." Premature to recommend requiring native
tagging as the permanent answer: this looks increasingly like an access-level question (would
App Review unlock caption mentions and/or hashtag search?) rather than evidence that those
mechanisms don't work. That question needs its own answer before Q3 can be resolved.

## 4. Is polling/reconciliation required?

**Probably, but the one polling path we hoped would avoid Advanced Access (hashtag search)
turned out to need it too.** Webhook push has not delivered for caption-only mentions under
Standard Access (Tests C, D). `/tags` polling works, but only for native tags. Hashtag-based
polling (`ig_hashtag_search` → `recent_media` → `mentioned_media`, Test E) was meant to be a
reconciliation path that sidestepped the mention-webhook question entirely — it instead hit an
explicit Advanced Access/App Review gate on "Instagram Public Content Access" before even
reaching the question of whether it would find the post. **So: polling/reconciliation is likely
still required in production, but at least one of its candidate implementations (hashtag search)
requires App Review to use at all**, same open question as webhook delivery (Q2, Q12).
Pagination behavior of `/tags` was also never fully confirmed (no `paging` object was ever
returned in any response captured, despite Meta's docs describing cursor-based pagination for
this edge) — worth re-testing with an explicit `limit` parameter before relying on `/tags` for a
potentially large real history.

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

**Revised again 2026-10-20 — confirmed, not just theorized, for at least one feature.** Standard
Access remains sufficient for API calls against the app's own role-holder-owned assets — listing
Pages, retrieving `mentioned_media` by known ID, polling `/tags`. But **"Instagram Public Content
Access" (`ig_hashtag_search`, used for hashtag-based discovery) explicitly requires App Review —
confirmed directly by Meta's own error text** (Test E, `SPIKE-RESULTS.md` Section 3.1), not
inferred from indirect symptoms. The parallel hypothesis for **webhook event delivery** —
Standard Access only covers role-holder-triggered events, arbitrary public participants require
Advanced Access — remains a strong, now better-corroborated theory (Tests C, D) but is not yet
confirmed with the same directness as the hashtag-search rejection. **Practical implication: App
Review is very likely a hard production requirement**, covering at minimum the hashtag-search
capability and plausibly mention-webhook delivery too — this is a substantial undertaking
(Business Verification, a screencast of the exact flow, review turnaround time), not a quick
configuration fix. Separately, significant *self-serve configuration* difficulty was encountered
on the Facebook Login path — permissions not appearing in the expected picker until routed
through the correct guided setup flow, and a lengthy misdirection around which Business
Portfolio owned the test Page (`SPIKE-RESULTS.md` Section 1b). That part is one-time developer
friction, distinct from the Advanced-Access/App-Review question above, which is a recurring
production requirement, not a one-time setup cost.

## 13. Any blocker to the MVP?

**Revised again 2026-10-20 — the blocker has crystallized into a specific, named requirement:
App Review for Advanced Access, not a broken discovery mechanism.** Previous framing ("no
automated caption-mention discovery path") overstated the conclusion; then-corrected framing
("no confirmed direct caption-mention discovery path under Standard Access") has now been
substantially validated by Test E's explicit, Meta-confirmed Advanced Access rejection on
hashtag search — the same access-level restriction class webhook delivery was theorized to hit.
**This is genuinely good news relative to where the investigation started**: nothing tested so
far suggests caption mentions or hashtag-based discovery are broken or unsupported by Meta — only
that they require a review process we haven't gone through. That reframes this from "is the
mechanism viable" to "is App Review worth pursuing for this MVP," a product/timeline decision,
not an engineering dead end. Per the spike's own criteria (`prompts/INSTAGRAM-API-SPIKE.md`
Section 25), this now reads as **Yellow, not Red** — "different login path required" territory
is closer than "participant mentions cannot be reliably discovered," since the mentions/hashtag
mechanisms themselves haven't failed, access to use them without review has. All other tested
capabilities (auth on both paths, Page/Instagram linkage, metadata retrieval once a media ID is
known) remain solid. Next useful test: confirm the webhook-side hypothesis directly, e.g. by
adding a participant as an Instagram Tester and repeating Test C or D — if the webhook fires for
a role-holder-triggered mention under Standard Access, that isolates the cause cleanly rather
than relying on Test E's corroboration-by-analogy.
