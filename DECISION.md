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
Login's `/tags` polling edge (Test A1, PASS). **Test E (hashtag polling, setup ready, not yet
run) tests an entirely separate, access-level-independent discovery path** — `ig_hashtag_search`
+ `recent_media` + `mentioned_media`, which doesn't depend on webhook delivery at all.

## 3. Support @mentions, tags, or both?

**Not yet decidable — current evidence shows native tags working and caption mentions not yet
confirmed working via direct webhook/polling, but the latter may be a Standard Access artifact
rather than a mechanism limitation (see Q2).** Native tags are the only mechanism with a
confirmed, working discovery path so far (via `/tags` polling). Caption-only mentions have no
confirmed *direct* discovery path on either login product as of this spike, under Standard
Access. Test E is testing whether hashtag-based polling resolves this without relying on direct
caption-mention discovery at all — if it passes, the product's original preferred model
("@mention = discovery, hashtags = validation") may be achievable via a hashtag-first,
mention-resolution-second flow rather than needing native tags. Premature to recommend
requiring native tagging until Test E's result and the Standard Access question are both in.

## 4. Is polling/reconciliation required?

**Likely yes, but the shape of it is still being determined.** Webhook push has not delivered
for caption-only mentions under Standard Access in either test run (Tests C, D) — whether that's
a mechanism limitation or an access-level artifact is unresolved (Q2). `/tags` polling has a
confirmed working path for native tags, but no documented listing/search edge exists for
caption-only mentions directly; `mentioned_media` requires already knowing a media ID, it cannot
discover new ones. **Test E is testing whether hashtag-based polling (`ig_hashtag_search` +
`recent_media` + `mentioned_media`) provides a working reconciliation path that sidesteps both
the mention-webhook and the mention-listing gaps entirely** — if it passes, polling via the
challenge hashtag (which the product already requires per its hashtag-validation model) becomes
the answer to this question, independent of whatever is eventually found for direct mentions.
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

**Revised 2026-10-20 — this is now a more load-bearing question than first assessed.** Standard
Access has been sufficient for every *API read call* tested — listing Pages, retrieving
`mentioned_media`, polling `/tags`, hashtag search — all against accounts/assets the app's own
role-holder (Admin) owns and manages, no App Review hit. But **webhook event delivery may be a
different story**: Meta's docs state Standard Access only delivers webhook events triggered by
people with a role on the app; events from arbitrary public participants (exactly the production
use case) require **Advanced Access, which requires App Review.** Tests C and D's null webhook
results are consistent with this restriction, not yet proven to be caused by it (see Q2). If
confirmed, **App Review for the relevant permission(s) would become a hard production
requirement for any webhook-based discovery mechanism**, independent of which login path is
chosen. Separately, significant *self-serve configuration* difficulty was encountered on the
Facebook Login path — permissions not appearing in the expected picker until routed through the
correct guided setup flow, and a lengthy misdirection around which Business Portfolio owned the
test Page (see `SPIKE-RESULTS.md` Section 1b). That part is one-time developer friction, not a
recurring organizer cost or a review gate — keep that distinct from the Advanced-Access question
above, which could be a recurring production requirement.

## 13. Any blocker to the MVP?

**Revised 2026-10-20 — not confirmed as a blocker yet, narrowed to a specific open question
under active investigation.** Previous framing ("no automated caption-mention discovery path")
overstated the conclusion; corrected to: **no confirmed DIRECT caption-mention discovery path
under our current Standard Access configuration.** Two live threads are open before this can be
called a blocker one way or the other: (1) whether Test C/D's null webhook results are caused by
Standard Access's documented restriction to role-holder-triggered events rather than a mechanism
failure (see Q2, Q12) — not yet isolated; (2) **Test E**, testing whether hashtag-based polling
(`ig_hashtag_search` → `recent_media` → `mentioned_media`) provides a working discovery path that
doesn't depend on mention webhooks or Advanced Access at all — setup/code ready, not yet run. If
Test E passes, it's recorded as a PASS for poll-based challenge submission discovery, a materially
different and additional finding, even if direct caption-mention discovery remains unresolved.
All other tested capabilities (auth on both paths, Page/Instagram linkage, metadata retrieval
once a media ID is known) are solid. Per the spike's own Red-criteria ("participant mentions
cannot be reliably discovered" — `prompts/INSTAGRAM-API-SPIKE.md` Section 25), this remains a
specific, isolated, well-characterized open question, not a Red verdict for the whole spike —
and Test E may resolve it without needing to answer the webhook/Advanced-Access question at all.
