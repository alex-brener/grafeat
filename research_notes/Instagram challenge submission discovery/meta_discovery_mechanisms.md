# Meta/Instagram Platform API Discovery Mechanisms for Finding Mentions (2026)

## Inventory: every mechanism, with exact endpoint, host, login product, and DISCOVERY vs LOOKUP classification

### Takeaway
Across the entire current (2026) Instagram Platform surface, every mechanism that touches "who mentioned/tagged my account" is either (a) a **LOOKUP** edge that requires a `media_id` or `comment_id` the caller already has, or (b) a **webhook push** that the caller cannot poll/replay as a list. The only true enumerable **DISCOVERY** list-edges in the whole platform are `/{ig-user-id}/tags` (native Tag-People tags, not caption @mentions) and the hashtag-search edges (`top_media`/`recent_media`, which discover by hashtag, not by @mention). There is no list/search/cursor edge that returns "media that mentions user X" by enumeration.

### Cited Findings

**Instagram API with Instagram Login — Mentions guide**
- The guide's documented workflow is: subscribe to the `comments` webhook → when a notification arrives, parse it for a `comment_id` → use that ID to query the comment/media details → optionally `POST /{IG_ID}/mentions` to reply. This is webhook-driven, not pollable. — [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/)
- Two endpoints are documented: `GET /{IG_ID}/tags` (media in which the Business/Creator Account has been **tagged**) and `POST /{IG_ID}/mentions` (reply to a comment or media caption the account was @mentioned in by another user). — [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/)
- Explicit limitations stated in the guide: "Mentions on Stories are not supported," commenting on photos the account was tagged in is not supported, and **webhooks will not be sent if the media the comment/@mention appears on was created by an account set to private.** — [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/)
- Required permissions for this flow: `instagram_business_basic` and `instagram_business_manage_comments`. — [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/)
- Host for Instagram API with Instagram Login is `graph.instagram.com` (Business Login for Instagram, Instagram User access token, no Facebook Page required); host for Instagram API with Facebook Login is `graph.facebook.com` (Facebook User access token, requires a linked Page). — [search synthesis citing developers.facebook.com/docs/instagram-platform/overview/ and reference pages](https://developers.facebook.com/docs/instagram-platform/overview/)

**`mentioned_media` edge — LOOKUP, requires known media_id**
- Gets data on an IG Media object in which an IG User has been @mentioned **in a caption** by another Instagram user. — [Mentioned Media - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/user/mentioned_media)
- Query syntax: `GET /{ig-user-id}?fields=mentioned_media.media_id({media_id}){fields}` — the `media_id` parameter is **required** and must already be known (e.g., extracted from a webhook payload); this edge cannot be called with no ID to produce a list. — [Mentioned Media - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/user/mentioned_media)
- Returnable sub-fields once a media_id is supplied: caption, comments, comments_count, like_count, media_type, media_url, owner, timestamp, username. — [Mentioned Media - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/user/mentioned_media)
- Classification: **LOOKUP** (requires a known media_id as an argument; cannot enumerate unknown mentioning media).

**`mentioned_comment` edge — LOOKUP, requires known comment_id**
- Gets data on an IG Comment in which an IG User has been @mentioned by another Instagram user; `comment_id` is a required parameter (the comment ID obtained from a prior mention notification). Default returned fields: id, text, timestamp, username, media. — [search synthesis of Meta documentation, no stable canonical URL could be directly re-verified in this session — the equivalent `/docs/instagram-api/reference/user/mentioned_comment` URL returned HTTP 404 at fetch time, possibly due to a documentation reorg; the `ig-user` reference page confirms the edge exists](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- A note surfaced during research: "Requests cannot be performed on comments discovered through the Mentions API unless the request is made by the comment owner. Instead, use the Mentioned Comment node" — reinforcing that `mentioned_comment` is a secondary lookup used after a webhook/mentions notification, not an independent discovery path. — [search synthesis, unable to pin an exact primary URL for this specific sentence]
- Classification: **LOOKUP**.

**IG User `tags` edge — the one true DISCOVERY list-edge, but it is native tagging, not caption @mentions**
- `GET /{ig-user-id}/tags` → "a list of [IG Media] objects in which an [IG User] has been tagged by another Instagram user." This is a genuine list/discovery edge — it returns a collection without requiring any specific media_id as input. — [Tags - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/ig-user/tags)
- Critically, this is **native Instagram "Tag People" tagging only — not caption @mentions.** The tags edge and the mentions/mentioned_media mechanism are documented as two distinct concepts. — [Tags - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/ig-user/tags); corroborated by [IG User edges table, Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- Host: `graph.facebook.com`. Required permissions (older/Facebook-Login-era doc): `instagram_basic`, `instagram_manage_comments`, `pages_read_engagement`, `pages_show_list` (and `ads_management`/`ads_read` if the token belongs to a Business Manager user). — [Tags - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/ig-user/tags)
- `media_url` is omitted from `tags` (and from `business_discovery`, `mentions`, hashtag search, and collaborative-media results) for videos with copyrighted/licensed audio or reels with downloads disabled. — [IG User edges table, Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- Classification: **DISCOVERY** (lists media without a known ID) — but out of scope for the product's need, since it only surfaces native people-tags, not caption/comment @mentions of the organizer handle.

**IG User `mentions` edge — a write (reply) edge, not a read/discovery edge**
- `POST /{IG_USER_ID}/mentions` creates an IG Comment reply on a comment or captioned IG Media the account was @mentioned in. It is a write-only action edge, not a list/read mechanism. — [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/); [IG User edges table](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- Classification: **N/A (write/reply action)** — not a discovery mechanism in either direction.

**Business Discovery — LOOKUP of a named OTHER account's own media, not of mentions**
- The Business Discovery edge is used to "get data about other Instagram Business/Creator accounts." Syntax: `GET /{your-ig-user-id}?fields=business_discovery.username({target}){fields}`. — [IG User edges table, Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- It requires knowing the target account's **username** in advance and returns that target's own profile metadata/metrics (biography, followers_count, follows_count, media_count, profile_picture_url, website, etc.) and that target's **own** media — not media belonging to other accounts that mention the target. — [IG User edges table, Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/); corroborated by [Business Discovery API search synthesis citing developers.facebook.com/docs/instagram-api/business-discovery](https://developers.facebook.com/docs/instagram-api/business-discovery) (this exact legacy URL returned HTTP 404 on direct fetch in this session, suggesting the page has moved/been retired in favor of the ig-user reference page)
- It only works for public Business/Creator accounts, under standard Platform Rate Limits — not for private or personal accounts. — [search synthesis of Business Discovery documentation](https://developers.facebook.com/docs/instagram-api/business-discovery)
- Classification: **LOOKUP by known username, of the target's OWN content** — it is not a mechanism for discovering posts by third parties that mention/tag the caller's account. It is the inverse direction from what the product needs (it lets you check *your organizer account's own* profile/media as seen by itself, or any other named public account's own media — never "who mentioned this account").

**Hashtag search — true DISCOVERY, but for hashtags, not @mentions**
- Workflow: `GET /ig_hashtag_search?user_id={ig-user-id}&hashtag={hashtag_name}` to resolve a hashtag to a node ID, then `GET /{ig-hashtag-id}/top_media` or `GET /{ig-hashtag-id}/recent_media` to list media carrying that hashtag. — [search synthesis of Instagram Graph API hashtag documentation](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- Rate limit: 30 unique hashtags queryable per 7-day rolling window per IG User token. — [search synthesis of hashtag documentation]
- Classification: **DISCOVERY** (genuinely enumerates unknown media) — but it indexes by **hashtag only**, not by @mention/tag of an account. Relevant to the product only as a workaround if challenge submissions are required to include a dedicated hashtag in addition to the @mention.

### Inferences
- The product cannot rely on any Meta-provided "list of mentions" endpoint; every read-oriented mention mechanism (`mentioned_media`, `mentioned_comment`) is scoped to a single already-known ID, and the only account-level discovery list edge (`tags`) is scoped to native tagging, not caption mentions.
- Because Business Discovery looks up a *named* account's own media (not mentions of it), it cannot be used to find who mentioned the organizer by iterating over candidate submitter usernames unless the product already has a closed list of participant handles to check one by one — and even then it returns the participant's own feed, not flagged/filtered by mention content, so the product would have to fetch each candidate's media and grep captions itself (expensive, and only works for participants who are themselves Business/Creator accounts, not personal accounts).

### Gaps
- A stable, current canonical doc URL for `mentioned_comment` could not be directly re-verified in this session (the natural URL pattern `/docs/instagram-api/reference/user/mentioned_comment` 404s); its existence and required `comment_id` parameter are corroborated via the IG User edges table and secondary synthesis, but I was not able to fetch its raw primary-source page to quote exact syntax.
- The legacy `/docs/instagram-api/business-discovery` URL also 404s; current canonical documentation for Business Discovery appears consolidated into the IG User reference page, but a dedicated Business Discovery doc page (if it still exists under a new path) was not located and fetched directly.

---

## Is there ANY official Meta mechanism to PULL/POLL "give me a list of posts that recently mentioned @organizer" without already knowing media IDs?

### Takeaway
**No.** Across the Instagram Platform reference tree, webhooks reference, and the Instagram-Login-specific Mentions guide, there is no enumerable list/search/cursor/activity-log edge that returns "media that mentioned this account" by enumeration. The only two mechanisms that actually push or list anything relevant are (1) the real-time webhook push (which only delivers mentions that occur *after* subscription and cannot be replayed/backfilled/paginated), and (2) the native-tag `tags` list edge, which is DISCOVERY but indexes "Tag People" tags, not caption/comment @mentions.

### Cited Findings
- The documented, Meta-sanctioned workflow for finding mentions is: **webhook push → extract ID from payload → LOOKUP via `mentioned_media`/`mentioned_comment` using that ID.** No step in this officially documented flow involves listing or searching for mentions by account; the ID must come from the webhook. — [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/)
- `mentioned_media` and `mentioned_comment` both require a specific `media_id`/`comment_id` as an input parameter — by definition this is a single-item lookup API, not a paginated list. — [Mentioned Media - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/user/mentioned_media)
- The only genuinely enumerable account-level list edge in the IG User reference, `tags`, is explicitly native-tagging ("Tag People"), separate from caption @mentions. — [Tags - Instagram Platform](https://developers.facebook.com/docs/instagram-api/reference/ig-user/tags)
- No changelog or release-notes evidence of a new mentions-listing/search feature was found for 2025 or 2026. Searches for Instagram Graph API changelog entries in this window surfaced only unrelated changes (Instagram Basic Display API end-of-life on Dec 4, 2024; messaging feature additions such as PDF attachments and threaded message replies in Direct; metric deprecations for Insights such as `clips_replays_count` and `impressions` effective April 21, 2025). None introduced a mentions-listing or mentions-search capability. — [v22.0 - Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog/version22.0/); general changelog search results (secondary blog aggregation, no primary Meta changelog entry found describing a new mentions-discovery feature)

### Inferences
- The absence of any list/search edge for mentions, combined with the documented webhook-first workflow in Meta's own Mentions guide, strongly implies this is an intentional product design on Meta's side: mentions are meant to be consumed in real time via webhook, not backfilled or polled historically.
- A practical consequence for the product: if the webhook subscription is not active (or drops a delivery) at the moment a challenge-submission post is created, there is **no official retry/backfill mechanism** — the mention cannot later be "listed" or "discovered" after the fact via any Meta API found in this research. The only backfill-ish option in the whole surface is polling the `tags` edge (native tags only) or running hashtag search against a required challenge hashtag — neither covers a pure caption/comment @mention that was missed.

### Gaps
- It is possible (but not confirmed in documentation found here) that Meta offers a webhook delivery-retry or dead-letter mechanism at the platform level (standard Graph API webhook retry behavior with exponential backoff) — this was not separately researched here since it is about delivery reliability of the push, not a pollable discovery list, and is outside this task's scope as defined.

---

## Instagram Login's webhook "mentions... included in the comments webhook notification" — payload shape and caption-vs-comment distinction

### Takeaway
For the Instagram API with Instagram Login product, the webhook fields matrix does **not** list an independent `mentions` field at all — only `comments` (plus messaging-related fields). Mention data for this product is folded into the standard `comments` webhook notification, whose documented payload (id, from{id, username}, text, media{id, media_product_type}, parent_id) has **no field that flags "this is a mention" vs "this is an ordinary reply comment,"** and no part of the documentation found distinguishes a pure caption @mention from a true comment within that payload shape.

### Cited Findings
- The Instagram webhook fields/permissions matrix lists, for "Instagram API with Instagram Login": `comments`, `live_comments`, `message_echoes`, `message_reactions`, `messages`, `messaging_handover`, `messaging_optins`, `messaging_postbacks`, `messaging_referral`, `messaging_seen`, `standby` — **no separate `mentions` field appears in this list.** — [Instagram webhook fields and permissions matrix](https://developers.facebook.com/documentation/instagram-platform/webhooks/fields) (content retrieved via an extraction tool rather than directly viewed as raw HTML by this researcher — treat the exact wording as a close paraphrase of the primary source rather than a verbatim quote)
- Per that same source, for Instagram Login specifically, "Mentions are not separately subscribable; they are 'Included in the `comments` webhook notification'" rather than an independently subscribable field — this directly matches the premise in the task's key question. — [Instagram webhook fields and permissions matrix](https://developers.facebook.com/documentation/instagram-platform/webhooks/fields)
- The documented `comments` webhook payload shape (from the Graph API Webhooks reference and the Instagram Platform webhook examples page) is:
  ```json
  {
    "field": "comments",
    "value": {
      "id": "<COMMENT_ID>",
      "from": { "id": "<INSTAGRAM_SCOPED_USER_ID>", "username": "<USERNAME>" },
      "text": "<COMMENT_TEXT>",
      "media": { "id": "<MEDIA_ID>", "media_product_type": "<MEDIA_PRODUCT_TYPE>" },
      "parent_id": "<PARENT_COMMENT_ID or null>"
    }
  }
  ```
  — [Webhooks Reference: Instagram](https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram); [Instagram Platform Webhook Notification Examples](https://developers.secure.facebook.com/documentation/instagram-platform/webhooks/examples)
- No field in this payload (e.g., no `is_mention` boolean, no distinct `mention` object) distinguishes a message that happens to @mention the account from an ordinary comment reply — the only documented way to know "this is a mention" is that the app must itself detect the organizer's own @handle inside the `text` string, or rely on the fact that it arrived at all despite the commenter not owning the media (the Mentions guide's workflow implies the app must inspect `text`/context itself). — [Instagram Platform Webhook Notification Examples](https://developers.secure.facebook.com/documentation/instagram-platform/webhooks/examples); [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/)
- Critically for the product's use case: the Mentions guide's documented workflow is built around **comment** mentions (parsing `comment_id` out of the comments webhook). Nothing in the Instagram Login mentions guide or webhook docs found in this research describes a distinct, independently-fired notification for a **pure caption @mention with zero comment activity** under this product. The guide's own worked example is phrased around "listen for comment @mentions," not caption-only mentions. — [Mentions - Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/)

### Inferences
- Because Instagram Login's `comments` webhook is the only mention-carrying channel, and it fires on comment-type activity, a caption-only @mention (e.g., organizer's handle appears only in the post caption, with no comment ever made) may not reliably generate any webhook notification at all under this product — the documentation's own framing ("mentions you in a comment or caption... Included in the comments webhook notification") is ambiguous about whether a caption mention with no accompanying comment activity triggers the `comments` webhook by itself, versus only firing when something comment-shaped (even a system-generated comment-equivalent) is created.
- This is a meaningful product risk: if challenge submitters only put the @mention in the post caption and never comment, Instagram Login apps may have no reliable webhook signal at all for that submission.

### Gaps
- Meta's documentation does not explicitly state, in the text retrieved during this research, whether a pure caption @mention (no comment) actually fires the `comments` webhook under Instagram Login, or whether it is silently dropped. This is a real ambiguity in the primary source that should be flagged rather than resolved by inference — the task's own framing anticipated this ambiguity, and it was confirmed as unresolved here.
- I was not able to directly view the raw HTML of `https://developers.facebook.com/documentation/instagram-platform/webhooks/fields` (only an extracted summary via the fetch tool); a human should re-verify the exact wording directly in a browser, since Meta's docs for this product have been reorganized recently (the `/documentation/` path vs `/docs/` path split) and content may differ by doc version.

---

## Facebook Login's dedicated Instagram webhook "mentions" field — payload shape and caption-only coverage

### Takeaway
For the Instagram API with Facebook Login product (and the general Graph API Webhooks "Instagram" object), `mentions` **is** an independently subscribable webhook field, separate from `comments`. Its documented payload is `{media_id, comment_id}`, and it explicitly supports a caption-only case: a "Mentions on Media" notification carries only `media_id` (no comment-related field), distinct from a "Mentions on Comments" notification which carries both `media_id` and `comment_id`.

### Cited Findings
- The Graph API Webhooks reference page for the Instagram object lists these fields: `comments`, `messaging_handover`, `live_comments`, `message_edit`, `message_reactions`, `messages`, `mentions`, `messaging_referral`, `messaging_seen`, `messaging_postbacks`, `standby`, `story_insights`. — [Webhooks Reference: Instagram](https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram)
- `mentions` field description: "Notifies you when an Instagram User @mentions you in a comment or caption on a media object that you do not own." This field is listed as a separate, independently subscribable webhook field — not incorporated into the `comments` notification, for this product. — [Webhooks Reference: Instagram](https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram)
- The documented payload shape is:
  ```json
  { "field": "mentions", "value": { "media_id": "string", "comment_id": "string" } }
  ```
  — [Webhooks Reference: Instagram](https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram)
- The webhook notification examples documentation distinguishes two sub-cases within this `mentions` field: **"Mentions on Media"** — triggered when the account is mentioned in a caption, with a payload containing only `media_id` (no comment-related field) — and **"Mentions on Comments"** — triggered when the account is mentioned inside a comment, with a payload containing both `comment_id` and `media_id`. — [Instagram Platform Webhook Notification Examples](https://developers.secure.facebook.com/documentation/instagram-platform/webhooks/examples)
- This directly answers the task's question about caption-only coverage: **yes**, Facebook Login's `mentions` field does address a pure caption mention with no comment involved — it is the "Mentions on Media" sub-case, identifiable because `comment_id` is absent/empty while `media_id` is present. — [Instagram Platform Webhook Notification Examples](https://developers.secure.facebook.com/documentation/instagram-platform/webhooks/examples)

### Inferences
- This means the Facebook Login product is structurally better suited than the Instagram Login product for the stated use case (catching caption-only @mentions reliably), since it has a dedicated, independently-subscribable `mentions` field with a documented caption-only payload shape, whereas Instagram Login folds mentions into `comments` with no documented guarantee about caption-only firing (see prior section's Gap).
- The product should likely prefer onboarding organizer accounts via the Facebook Login product (Page-linked Instagram Business account) specifically to get this more complete mentions webhook coverage, if that trade-off (requiring a linked Facebook Page) is acceptable.

### Gaps
- I could not locate a side-by-side, single authoritative Meta page that explicitly states "Instagram Login does not get a caption-only mentions webhook the way Facebook Login does" — this comparative conclusion is an inference drawn by contrasting the two products' separate documentation pages, not a directly quoted statement from Meta. This should be flagged to the report writer as inferred, not confirmed in a single source.

---

## Business Discovery: DISCOVERY or LOOKUP, and does it find mentions?

### Takeaway
Business Discovery is a **LOOKUP** mechanism in the DISCOVERY/LOOKUP sense defined for this task: it requires the caller to already know a target account's username, and it returns that target's *own* public profile data and *own* media — never media belonging to third parties that mention/tag the target. It is not usable to find who has mentioned the organizer.

### Cited Findings
- Business Discovery "allows you to get basic metadata and metrics for other Instagram Business Accounts" via the `business_discovery` edge on an IG User node: `GET /{your-ig-user-id}?fields=business_discovery.username({target}){fields}`. — [IG User edges table, Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- Available returned fields include biography, followers_count, follows_count, media_count, profile_picture_url, website, and (per general Business Discovery documentation) the target's own media collection. — [IG User edges table, Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)
- It only works for public Business or Creator accounts; personal/private accounts are not accessible through it. — [search synthesis of Business Discovery documentation](https://developers.facebook.com/docs/instagram-api/business-discovery)
- It requires knowing the target's username in advance (a `.username({target})` parameter) — it cannot be used to search or discover accounts, only to look up a specifically named one. — [IG User edges table, Instagram Platform](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/)

### Inferences
- Even in theory, Business Discovery could only be abused for the product's goal by: (a) maintaining a closed roster of candidate participant usernames, (b) calling Business Discovery once per candidate to pull their own recent media, and (c) grepping each candidate's own captions client-side for the organizer's handle. This is LOOKUP-of-known-accounts, not discovery of unknown mentioning posts, and fails entirely for any participant account that is not itself a Business/Creator account (ordinary personal accounts are excluded).

### Gaps
- The precise current canonical doc URL for Business Discovery (the legacy `/docs/instagram-api/business-discovery` page returned 404 at fetch time) could not be directly confirmed; content here is corroborated via the IG User edges reference table and secondary search synthesis of the (likely retired) dedicated page, not a freshly fetched primary page.

---

## Any other current (2026) official Meta APIs relevant to finding mentions/tags, including anything newer than the above

### Takeaway
No additional or newer (2025/2026) official mechanism was found beyond what is covered above. The closest adjacent, genuinely enumerable DISCOVERY mechanism is hashtag search (`ig_hashtag_search` → `top_media`/`recent_media`), which is unrelated to @mentions and indexes by hashtag only.

### Cited Findings
- Hashtag search workflow: `GET /ig_hashtag_search?user_id={ig-user-id}&hashtag={hashtag_name}` to resolve a hashtag ID, then `GET /{ig-hashtag-id}/top_media` or `GET /{ig-hashtag-id}/recent_media` to list media carrying that hashtag; limited to 30 unique hashtags queryable per rolling 7-day window per IG User token. — [search synthesis of Instagram Graph API hashtag documentation]
- Changelog research for 2025–2026 surfaced: Instagram Basic Display API end-of-life Dec 4, 2024 (no longer functional, all integrations must use Instagram Graph/Messaging APIs); Insights metric deprecations (`clips_replays_count`, `ig_reels_aggregated_all_plays_count`, `impressions`, `plays`) effective April 21, 2025; Direct messaging additions (PDF attachments, threaded message replies) in late 2025. None of these introduce a mentions-listing, mentions-search, or activity-log capability. — [v22.0 - Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog/version22.0/); general secondary blog aggregation of 2026 changes (no primary Meta changelog page found describing a mentions-discovery feature specifically)
- No "notifications" or "activity log" endpoint exists in the Instagram Platform reference tree surfaced by this research; webhook push plus the per-ID lookup edges (`mentioned_media`, `mentioned_comment`) remain the complete documented mechanism for mentions as of this research date (Oct 2026). — [search synthesis across Instagram Platform reference pages]

### Inferences
- Given the consistency of the webhook-first design across both login products, and the absence of any 2025/2026 changelog entry introducing a mentions list/search capability, it appears Meta has deliberately not built (and has no visible near-term plan to build) a backfill/search mechanism for mentions — the product should treat the webhook as the sole real-time discovery channel and design for the possibility of missed/undeliverable notifications without an official recovery path.

### Gaps
- Could not confirm the exact current Graph API version number in use as of Oct 2026 via a primary Meta source in this session (one secondary aggregator claimed v26.0 released July 29, 2026, but this was not independently verified against a primary developers.facebook.com changelog page within the scope of this research pass) — flagged as unconfirmed, not fact.
- A systematic review of every single Graph API changelog entry for all of 2025 and 2026 was not performed (would require fetching each version's changelog page individually); only a sampled search was done. A more exhaustive pass through `developers.facebook.com/docs/graph-api/changelog/versionXX.0/` pages would be needed to rule out a missed changelog entry with full confidence.
