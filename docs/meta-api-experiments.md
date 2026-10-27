# Meta/Instagram API Experiments — Traceable Record

A concise, source-cited record of every Instagram/Meta Graph API experiment referenced in this project's history, compiled retrospectively from documentation and conversation record for handover purposes. See `HANDOVER.md` Section 6 for the narrative summary this document backs with detail.

## Evidence basis — read this before trusting any entry below

**No raw API response is currently preserved anywhere in this repository.** `fixtures/` contains only its own `README.md` (no saved JSON responses exist on disk). `logs/spike.log.jsonl` exists but contains only unrelated OAuth-CSRF testing entries from the later security-hardening work (`auth.facebook_login.invalid_state`, `auth.instagram_login.invalid_state`, `webhook.verify` — all from local testing in October 2026, none of them Meta discovery-API calls). This was confirmed by inspecting both directories directly, not assumed.

Every finding below is therefore sourced from **narrative documentation or the conversation record**, not from an independently re-checkable artifact. Each entry is labeled accordingly:

- **[VERIFIED — documented]** — recorded in `SPIKE-RESULTS.md`/`DECISION.md` as a specific, dated test result, including Meta's own stated response where applicable. Still narrative, not a saved raw payload — but the most load-bearing documentation this project has.
- **[REPORTED — not retained]** — stated as a successful real-world test result in `prompts/grafeat-instagram-submission-discovery.md`, with no accompanying fixture, log, or in-repo code implementing it. Treated as a genuine experimental finding per explicit instruction, not as an assumption — but there is nothing in this repository to independently re-verify it against.
- **[UNKNOWN]** — a specific detail (date, exact account, token provenance) that none of the available sources state, marked as missing rather than guessed.

---

## 1. Instagram Login OAuth authentication

- **Purpose:** Validate the "Instagram API with Instagram Login" OAuth product end-to-end.
- **Date:** Not stated precisely in sources; within the spike's active period, on or before the `DECISION.md` cutoff of 2026-10-20.
- **Account/token context:** The organizer's own Instagram professional account, connected via Instagram Login. No further detail available.
- **Request pattern (placeholders only):**
  ```
  GET https://www.instagram.com/oauth/authorize
    ?client_id={instagram_app_id}&redirect_uri={callback_url}&response_type=code
    &scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish

  POST https://api.instagram.com/oauth/access_token   (code exchange → short-lived token + inline user_id)
  GET  https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={app_secret}&access_token={short_lived_token}   (→ long-lived token)
  ```
- **Observed outcome:** PASS. Both the short-lived and long-lived token exchanges succeeded.
- **Evidence source:** `SPIKE-RESULTS.md` §1a.
- **Confidence:** [VERIFIED — documented].
- **Limitations:** No raw token-exchange response payload preserved in-repo.

## 2. Facebook Login for Business OAuth authentication

- **Purpose:** Validate the legacy "Facebook Login + Instagram Graph API" path, including the Facebook Page dependency.
- **Date:** Not stated precisely; same period as above.
- **Account/token context:** Organizer's Facebook account, Facebook Login for Business Configuration (`instagram_basic`, `instagram_manage_comments`, `pages_show_list`, `pages_read_engagement`, `business_management`).
- **Request pattern (placeholders only):**
  ```
  GET https://www.facebook.com/{graph_api_version}/dialog/oauth?client_id={app_id}&redirect_uri={callback_url}&response_type=code&config_id={config_id}
  GET https://graph.facebook.com/{graph_api_version}/oauth/access_token?client_id=...&client_secret=...&redirect_uri=...&code=...
  GET https://graph.facebook.com/{graph_api_version}/me/accounts?fields=id,name,category,tasks&access_token={token}
  ```
- **Observed outcome:** PASS, with two notable findings along the way:
  1. `/me/accounts` initially returned empty — root-caused to the organizer's Facebook Page being owned by a different Business Portfolio than the one managing the Meta app itself. Resolved by selecting the correct portfolio during OAuth consent; no code defect.
  2. A real, usable Facebook Page access token was briefly returned unredacted in a working response, because `/me/accounts` includes a per-page `access_token` field by default and the code at the time forwarded the object through without stripping it. **Fixed** by explicitly scoping the `fields=` parameter to exclude `access_token` (data minimization, not after-the-fact redaction). The exposed Page token was treated as compromised; app re-authorization invalidated tokens issued before the fix.
  3. The code-exchange call already returns a **long-lived (~60 day) user token directly** — no separate `fb_exchange_token` step is needed for this flow, confirmed by a real production `expires_in` value of ~5,181,810 seconds.
- **Evidence source:** `SPIKE-RESULTS.md` §1b.
- **Confidence:** [VERIFIED — documented].
- **Limitations:** No raw response payloads preserved in-repo.

## 3. `mentioned_media` retrieval (known historical media)

- **Purpose:** Test whether the documented `mentioned_media` field-expansion edge works at all, independent of how the media ID was obtained.
- **Date:** Not stated precisely; `SPIKE-RESULTS.md` §3.1.
- **Account/token context:** Facebook-Login-issued token; a historical, already-known post using the `#callivember` hashtag (sourced from an earlier `/tags` dump), caption-mentioning a specific external account. Role status of that external account (tester vs. fully independent) is **[UNKNOWN]** for this specific test — not stated in the source.
- **Request pattern (placeholders only):**
  ```
  GET https://graph.facebook.com/{graph_api_version}/{organizer_ig_id}
    ?fields=mentioned_media.media_id({media_id}){caption,media_type,media_url,permalink,timestamp,username,comments_count,like_count,owner}
    &access_token={token}
  ```
- **Observed outcome:** PASS — `caption`, `media_type`, `media_url`, `permalink`, `timestamp`, `username`, `comments_count`, `like_count` all returned correctly and completely.
- **Evidence source:** `SPIKE-RESULTS.md` §3.1.
- **Confidence:** [VERIFIED — documented].
- **Limitations:** Single known media ID, not a general population test. No raw response payload preserved in-repo. This is the first proof the field-expansion pattern works at all; it does not by itself establish whether it works for a fully independent (no app role) account — see Section 7 below for that finding.

## 4. Two separate Instagram-account-ID namespaces (cross-cutting finding, not a single experiment)

- **Purpose:** N/A — discovered as a side effect of Experiment 3 initially failing.
- **Observed outcome:** The Instagram account ID returned by Instagram Login's OAuth flow (`ORGANIZER_IG_USER_ID`, valid only against `graph.instagram.com`) is **not the same value** as the ID the Facebook Graph API uses for the same underlying account (`FACEBOOK_ORGANIZER_IG_USER_ID`, surfaced via `/me/accounts` → Page → `instagram_business_account.id`, valid against `graph.facebook.com`). Using the wrong one produces a Meta "does not exist" error that reads like a permissions problem.
- **Evidence source:** `SPIKE-RESULTS.md` §3.1.
- **Confidence:** [VERIFIED — documented].

## 5. Native `/tags` polling

- **Purpose:** Test `/tags` as a discovery fallback, independent of webhook delivery.
- **Account/token context:** Instagram-Login-issued token (must be used against `graph.instagram.com`, not `graph.facebook.com` — the two token types are not interchangeable; this was the source of an earlier "Cannot parse access token" / code 190 error).
- **Request pattern (placeholders only):**
  ```
  GET https://graph.instagram.com/{graph_api_version}/{organizer_ig_id}/tags
    ?fields=id,caption,media_type,media_url,permalink,timestamp,username
    &access_token={token}
  ```
- **Observed outcome:** PASS, with an important limitation — `/tags` only returns media where the account was **UI-tagged**, not caption `@mentions`. Pagination behavior was never fully confirmed: no `paging` object was observed in any captured response, despite Meta's documentation describing cursor-based pagination for this edge; `DECISION.md` explicitly recommended re-testing with an explicit `limit` parameter before relying on it for a potentially large real history.
- **Evidence source:** `SPIKE-RESULTS.md` §3.2/§3.3; `DECISION.md` Q4.
- **Confidence:** [VERIFIED — documented] for the core result; the pagination question itself is explicitly [UNKNOWN] per `DECISION.md`.

## 6. Caption-only `@mention` webhook delivery (Tests C and D)

- **Purpose:** Determine whether a pure caption-only `@mention` (no native tag) triggers webhook delivery, tested on both login products' relevant field (`comments` for Instagram Login, `mentions` for Facebook Login).
- **Account/token context:** Deliberately **non-role-holder** participant accounts, per the original spike brief's own instruction (Section 2) — i.e. accounts with no Admin/Developer/Tester role on the Meta app.
- **Observed outcome:** **Negative** — no webhook delivery was observed for a pure caption-only mention on either product's field.
- **Leading explanation (not confirmed):** Meta's webhook access-level documentation states Standard Access only delivers events triggered by people who have a role on the app; arbitrary public users may require Advanced Access. `DECISION.md` records this explicitly as *"a credible, not-yet-fully-isolated alternative explanation for the null result"* — not a confirmed root cause.
- **Evidence source:** `DECISION.md` Q2.
- **Confidence:** [VERIFIED — documented] for the negative result itself; the role-gating explanation is explicitly [UNKNOWN]/unconfirmed.

## 7. Hashtag-based discovery — original rejection (Test E)

- **Purpose:** Test `ig_hashtag_search` → `recent_media` → `mentioned_media` as a polling-based discovery path that would sidestep the webhook question entirely.
- **Observed outcome:** Explicit Meta rejection, quoted verbatim in `DECISION.md`: *"To use 'Instagram Public Content Access', your use of this endpoint must be reviewed and approved by Facebook."* This is Meta's own stated API response, not an inference.
- **Evidence source:** `DECISION.md` Q2, Q4, Q12.
- **Confidence:** [VERIFIED — documented].
- **Relationship to Experiments 8–9 below:** this result predates the newer reported successes and is not contradicted by them — see "Working API access vs. approved Advanced Access" at the end of this document.

## 8. Hashtag discovery with cursor pagination (newer)

- **Purpose:** Per `prompts/grafeat-instagram-submission-discovery.md`, test hashtag-based discovery with real pagination against an active, real-world hashtag.
- **Date:** [UNKNOWN] — not stated in the source document.
- **Account/token context:** [UNKNOWN] — the source document does not state which account, token, or access level was used.
- **Request pattern (as described, placeholders for identifiers):**
  ```
  GET /ig_hashtag_search?user_id={organizer_ig_id}&q={hashtag}
  GET /{hashtag_id}/recent_media?user_id={organizer_ig_id}&fields=id,caption,permalink,timestamp&limit=50
  ```
  Pagination via `paging.cursors.after`.
- **Observed outcome (as reported):** 400 posts successfully retrieved across eight pages from the active `#inktober` hashtag, with further pagination available. Public Personal-account posts were returned **without participant OAuth**.
- **Explicit caveats stated in the same source:** Pagination timestamps are **not guaranteed strictly ordered** across pages. The feed's **completeness is not established** — do not assume a fixed maximum result count or a guaranteed historical lookback period.
- **Evidence source:** `prompts/grafeat-instagram-submission-discovery.md` §2A.
- **Confidence:** [REPORTED — not retained]. No fixture, log, or code artifact in this repository implements or captures this result.

## 9. Genuine mention verification for independent accounts (newer)

- **Purpose:** Verify genuine organizer `@mentions` reliably. Caption text matching is explicitly inadequate: Instagram's API may strip the `@` symbol from genuine mentions in the caption text it returns, so a post can genuinely mention the organizer without the literal string `@organizerhandle` appearing in the caption field — text search would produce false negatives (and is also vulnerable to false positives from a mention typed as plain text without ever being a real tap-able mention). The field-expansion edge is the only reliable signal.
- **Request pattern (placeholders only):**
  ```
  GET /{organizer_ig_id}?fields=mentioned_media.media_id({candidate_media_id}){id,username,caption}
  ```
  Explicitly **not** `GET /{organizer_ig_id}/mentioned_media` — the source document calls this out as the wrong endpoint.
- **Observed outcome (as reported):** Successfully returned mention information for posts published by **independent public Personal accounts** — accounts with no role on the Grafeat app. This is a materially stronger claim than Experiment 3, which did not establish the role status of the account it was tested against.
- **Date / account / token context:** [UNKNOWN] — not stated in the source document.
- **Evidence source:** `prompts/grafeat-instagram-submission-discovery.md` §2B.
- **Confidence:** [REPORTED — not retained].

## 10. Mention-webhook unreliability for independent accounts (reconfirmation)

- **Purpose:** Restated in the newer brief as context for why webhook delivery should not be the primary discovery mechanism.
- **Observed outcome:** *"Real posts by independent Personal accounts mentioning the organizer did not reliably trigger mention webhooks in our tests."*
- **Relationship to Experiment 6:** This is consistent with, not contradictory to, the original Tests C/D null result — it reconfirms the same finding under what appears to be renewed or continued testing, rather than presenting a new or conflicting result.
- **Evidence source:** `prompts/grafeat-instagram-submission-discovery.md` §2C.
- **Confidence:** [REPORTED — not retained], consistent with [VERIFIED — documented] Experiment 6.

## 11. Live hashtag discovery + mention verification + media-availability experiment (newest, independently re-verifiable)

- **Purpose:** The Slice B "required technical discovery gate" — determine whether hashtag discovery, genuine-mention verification, and usable artwork imagery are all actually available through the production `lib/meta-graph.ts` client, using a dedicated, controlled test hashtag rather than a busy real one.
- **Date:** 2026-10-27.
- **Account/token context:** The connected `facebook_login` organizer connection for `@the_calligrail` (`igUserId 17841457665709817`), read from the live `meta_connection` table and decrypted the same way production code does. Hashtag: `#grafeattest2026` (dedicated, created solely for this test — not a busy real-world hashtag like `#inktober`, unlike Experiments 8–9).
- **Test posts:** Post A — public Personal account `@cc_spike_participant`, caption `"#grafeattest2026 the_calligrail"` (genuine mention). Post B — a different public Personal account, caption `"#grafeattest2026"` only (no mention).
- **Request pattern (real, via `lib/meta-graph.ts`, not placeholders):**
  ```
  GET https://graph.facebook.com/v21.0/ig_hashtag_search?user_id=17841457665709817&q=grafeattest2026
  GET https://graph.facebook.com/v21.0/{hashtag_id}/recent_media?user_id=17841457665709817&fields=id,caption,media_type,permalink,timestamp&limit=50
  GET https://graph.facebook.com/v21.0/17841457665709817?fields=mentioned_media.media_id({media_id}){username,caption,media_type,media_url,thumbnail_url,permalink}
  ```
- **Observed outcome — hashtag resolution + discovery:** PASS. `ig_hashtag_search` resolved to `hashtagId 18410775676092331`. `recent_media` returned exactly 2 items (both test posts, nothing else — confirming the dedicated-hashtag approach avoids noise), on the first page, immediately after publication — no indexing delay observed.
- **Observed outcome — genuine mention verification (Post A):** PASS, HTTP 200. `mentioned_media.media_id(...)` returned a populated object: `username: "cc_spike_participant"`, `caption`, `media_type: "IMAGE"`, `media_url` (a real `scontent.cdninstagram.com` signed CDN URL), `permalink`. No `thumbnail_url` for this `IMAGE`-type post.
- **Observed outcome — non-mention rejection (Post B) — the key finding:** Initially surfaced as a thrown `permissions`-classified error from `lib/meta-graph.ts`, not a clean rejection. The **raw** (unclassified) response, captured directly:
  ```json
  {
    "error": {
      "message": "(#10) User is not mentioned in the caption.",
      "type": "OAuthException",
      "code": 10,
      "fbtrace_id": "A33sGisMt3bX1VFx3OaNXN8"
    }
  }
  ```
  This is Meta's actual, confirmed signal for "this media does not mention the organizer" — an HTTP 400/code-10/OAuthException error, not a 200 with an empty object (the previously untested assumption baked into the original implementation). **This is a genuinely new finding, not previously documented anywhere in this project's history** — Experiments 3 and 9 above only ever tested the *positive* (genuine-mention) case.
- **Fix applied as a direct result:** `lib/meta-graph.ts`'s error classifier now recognizes this exact message pattern as a dedicated `not_mentioned` kind, checked *before* the generic code-10-permissions rule, and `fetchMentionedMedia` translates it back into a normal `{outcome: "not_mentioned"}` return — never surfaced as an error to the processing engine. Reproduced in `tests/meta-graph.test.ts` with the exact captured response above. Re-ran live after the fix: Post B now correctly resolves to `not_mentioned`.
- **Observed outcome — media URL reachability:** PASS. A real `HEAD` request against Post A's `media_url` returned HTTP 200, `content-type: image/jpeg`, `content-length: 12831` — confirmed to be an actual loadable image, not just a present-but-unverified string.
- **Evidence source:** This project's own Slice B conversation record, 2026-10-27 — raw request/response captured directly during the test (the first entry in this document with a genuinely captured, re-run-confirmed payload, not a narrative secondhand report).
- **Confidence:** **[VERIFIED — directly captured and independently re-run after the fix]**, the strongest evidence tier in this document.
- **Explicit scope limits — do not over-read this result:**
  1. **External-organizer Advanced Access remains unconfirmed.** This is the same single development connection used throughout the project (same as Experiments 1–10). It does not resolve the Experiment 7 vs. 8/9 tension described below — Meta could still reject this same call for a different organizer or a different app review state.
  2. **Post A's author, `@cc_spike_participant`, is the same account already connected to this Meta app via Instagram Login** (Experiment 1 / `docs/HANDOVER.md` §4) — not a fully arms-length, never-before-seen account. This doesn't invalidate the technical finding, but "verified for a genuinely unrelated participant" is still not independently established.
  3. **The returned `media_url` carries signed/expiring query parameters** (`oe=`, `oh=`, `_nc_*`) — must not be assumed permanent.

---

## Working API access vs. approved Advanced Access — do not conflate these

Experiments 8, 9, and now **11** are evidence that specific Graph API calls **worked** when tried — 11 being the strongest tier, since it's the first of these to be directly captured and independently re-run in this project's own history rather than reported secondhand. Experiment 7 is evidence that Meta **explicitly rejected** `ig_hashtag_search` pending "Instagram Public Content Access" review, as of the last point this was recorded in `DECISION.md`.

**These remain two different claims, and Experiment 11 does not resolve the gap either:**
- Whether a specific API call returned real data under whatever access conditions it was tried with ([REPORTED]/[VERIFIED] above) is **not the same fact** as whether Meta has formally granted Advanced Access that would extend to **arbitrary external Grafeat organizers and arbitrary public hashtags in production**.
- Both being true simultaneously is possible (Advanced Access may have been granted between `DECISION.md` and the newer brief/Experiment 11). It is equally possible all of the newer successes used the same single development connection/account, which would not automatically extend to production use by external customers — this is in fact confirmed true for Experiment 11 specifically (same connection used throughout this entire project), and merely unknown for 8/9.
- **This document, and the rest of this repository, does not contain the information needed to determine which.** Confirm current Advanced Access status directly in the Meta App Dashboard before relying on hashtag search as a production discovery mechanism for external organizers. See `docs/HANDOVER.md` §10/§14 for the same distinction applied to the current implementation.

---

*Compiled retrospectively for handover purposes (Experiments 1–10) and directly during testing (Experiment 11). If a future test is run and a real response is captured, update the relevant entry with a concrete evidence source rather than leaving it as [REPORTED — not retained].*
