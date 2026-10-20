# Meta Instagram Platform API — Access/Permission Requirements & Hashtag-Polling Feasibility (2026)

## PART 1 — ACCESS/PERMISSION MATRIX

### Q1a. What does Meta's Access Levels documentation say about Standard vs Advanced Access in general, and specifically for webhook delivery about non-role-holder public users and for "Instagram Public Content Access"?

#### Takeaway
Standard Access is auto-granted and restricted to "people who have a role on the requesting app" (admin/developer/tester, or — for business data — an account claimed by the business portfolio that owns the app); Advanced Access extends this to arbitrary users/businesses but requires Business Verification and, for most permissions/features, individual App Review. Meta's generic Access Levels page does **not** discuss webhooks or Instagram Public Content Access directly — those specifics live on the Instagram Platform / permission-reference pages instead.

#### Cited Findings
- "Permissions with Standard Access can only be requested from app users who have a role on the requesting app." — [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels)
- "Permissions with Advanced Access can be requested from any app user, and features with Advanced Access are active for all app users." — [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels)
- "Business Verification is required to get Advanced Access" and apps with Advanced Access "must complete Data Use Checkup, which is an annual process to certify that the app accesses Facebook APIs, products, and data in compliance [with Meta policy]." — [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels)
- Automatic Advanced Access (no review) applies only to `email` and `public_profile` for certain legacy apps created before Feb 16, 2021 — [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels). The generic Access Levels page contains **no text about webhooks or "Instagram Public Content Access"** — confirmed by direct fetch of the page.
- Community/third-party summary (not Meta-primary, but consistent with the above): "With Standard Access, you can receive notifications from people who have a role on your app... Advanced Access... allows you to receive notifications from customers who do not have a role on your app." — [getphyllo.com Instagram API Permissions](https://www.getphyllo.com/post/instagram-api-permissions-scopes) (third-party synthesis, not a direct Meta quote; treat as corroborating, not primary)
- Business Verification page (Meta-primary): Verification is mandatory when an app requests "advanced level access to permissions" (as of Feb 1, 2023) or allows "other Businesses to access their own data"; but **"If your app will only be used by app users who have a role on the app itself you do not need to complete verification."** — [Business Verification](https://developers.facebook.com/docs/development/release/business-verification)

#### Inferences
- For the webhook-delivery question specifically: the "role on the app" requirement under Standard Access appears to attach to the **subscribed/receiving IG User** (the business account that owns the webhook subscription), not to the person performing the triggering action (the person who writes the @mention). This is inferred by combining the Business Verification exception quote above with the `mentioned_media` edge documentation (Q4 below), which states the edge "returns data on an IG Media in which an IG User has been @mentioned... by **another Instagram user**" with no role restriction on that other user. If this inference is correct, a challenge host's own business account — which, as the app's claimed/owner business, inherently has a "role" on the app — could receive mention webhooks from arbitrary members of the public under Standard Access alone, without Advanced Access or App Review for that specific permission. This is an inference, not a directly stated Meta claim; no page explicitly says "mention webhooks from the public work under Standard Access."

#### Gaps
- No single Meta page explicitly states "Standard Access is sufficient for receiving @mention webhook events triggered by the public" — this is reconstructed from adjacent documentation (see inference above), not a direct quote. A user/developer with a live Standard Access app and no Advanced Access for `instagram_manage_comments`/`instagram_business_manage_comments` would need to test this directly to confirm beyond documentation inference.

---

### Q1b. What exactly is "Instagram Public Content Access" — which endpoints does it gate, and what does App Review for it require?

#### Takeaway
"Instagram Public Content Access" is a distinct, separately-reviewed Meta **Feature** (not a permission) that gates the three Hashtag-based endpoints — `ig_hashtag_search`, `{hashtag-id}/recent_media`, and `{hashtag-id}/top_media` — all confirmed directly from Meta's own reference pages. It does **not** appear to gate Business Discovery, based on a direct check of that endpoint's reference page (no mention of the feature there). App Review for the feature requires Business Verification, use-case description, and (per third-party guides, not confirmed directly on a Meta page in this session) a screencast; Meta explicitly restricts the allowed use cases to brand/advertiser/broadcaster/publisher-style content discovery.

#### Cited Findings
- `ig_hashtag_search` reference page lists a required **Feature: "Instagram Public Content Access"**, plus permission `instagram_basic` (and `ads_management`/`business_management`/`pages_read_engagement` if the token comes from a Business-Manager-granted Page role); max "30 unique hashtags within a 7 day period"; and will "return a generic error for any queries that include hashtags that we have deemed sensitive or offensive." — [IG Hashtag Search](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search)
- `{hashtag-id}/recent_media` reference page: Feature required is `Instagram Public Content Access`; permission `instagram_basic` (+ conditional Business Manager permissions); same 30-unique-hashtags/7-day rule. — [Recent Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media)
- `{hashtag-id}/top_media` reference page: Feature required is `Instagram Public Content Access`; permission `instagram_basic` (+ conditional Business Manager permissions); same 30-unique-hashtags/7-day rule; ranking is "determined by a mix of views and viewer interaction using the same methodology that determines the top posts when searching for a hashtag on www.instagram.com." — [Top Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media)
- Business Discovery (`{ig-user-id}?fields=business_discovery`) reference page: lists permissions `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement` (+ conditional Business Manager permissions); **does not mention "Instagram Public Content Access" anywhere on the page**; only stated limitation is "Data about age-gated Instagram Business IG Users will not be returned." — [Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery) (confirmed via direct fetch, explicitly checked for the feature requirement and found absent)
- App Review "reviewable feature" page for Instagram Public Content Access states the feature "access[es] Instagram Graph API's Hashtag Search endpoints" and restricts allowed uses to: "discover content associated with its current campaign," "provide customer support," "identify entrants to its contests, competitions, or sweepstakes," "understand public sentiment around brand," and "understand and manage their audience, develop their content strategy and obtain digital rights." — [App Review / Feature](https://developers.facebook.com/docs/apps/review/feature)
- Third-party synthesis (not a direct Meta quote, treat as corroborating): "This permission is only granted to apps that enable brands, advertisers, broadcasters and publishers to discover public content. Meta does not grant access to apps that do not fall into these categories." It "requires App Review and business verification, and Meta notes you may need to sign additional contracts." — [getphyllo.com](https://www.getphyllo.com/post/instagram-api-permissions-scopes)
- Third-party guide on App Review submission mechanics generally (not specific to this feature, general App Review practice): one screencast per permission/feature showing the live OAuth flow with a real Business/Creator account and the resulting data rendered in-app; a privacy policy URL, terms-of-service URL, and a reviewer-accessible test environment. — [saurabhdhar.com Meta App Approval Guide](https://www.saurabhdhar.com/blog/meta-app-approval-guide) (third-party, unverified against a current Meta-primary page in this session)
- One third-party source claims Business Discovery and Hashtag Search endpoints share a rate-limiting category distinct from other IG endpoints ("subject to Platform Rate limiting" rather than "Instagram Business Use Case rate limiting") — [socialsamosa.com](https://www.socialsamosa.com/news-2/meta-instagram-api-features-branded-content-analytics-11760299) (third-party; not independently confirmed on a Meta-primary page in this session; shared rate-limit *infrastructure* should not be conflated with a shared App-Review *feature gate* — the two are different things, and the Business Discovery reference page explicitly does not list the Public Content Access feature).

#### Inferences
- Business Discovery is very likely **not** gated by the "Instagram Public Content Access" feature review — it has its own, separate permission set (`instagram_manage_insights` instead of the hashtag-endpoints' feature gate) and its reference page never mentions the feature. This matters for the product: Business Discovery (looking up another business/creator account's own profile and that account's own recent media as self-published) is a materially different, non-reviewed-feature path, compared to hashtag search.

#### Gaps
- Could not confirm with a direct Meta-primary fetch whether the App Review submission form for "Instagram Public Content Access" specifically demands a screencast (this is asserted only by third-party guides, not confirmed on `developers.facebook.com/docs/apps/review/feature` in this session's fetch, which returned the use-case/allowed-uses text but not a submission checklist).
- Could not directly confirm the "additional contracts" claim (from a third-party aggregator) against a Meta-primary source.

---

### Q1c. Once Advanced Access for Instagram Public Content Access is granted, does it apply to ANY hashtag/any public account's content, or does it remain scoped?

#### Takeaway
Nothing in Meta's own reference pages describes any scoping of the feature by hashtag, account, or campaign once granted — the grant is at the app/feature level, and the only constraints documented are the universal ones (30 unique hashtags/7-day rolling window per querying IG User, and Meta's own sensitive/offensive-hashtag blocklist). However, Meta explicitly restricts *who* may be granted the feature at all (use-case categories below), which is a scoping of eligibility, not of query scope after approval.

#### Cited Findings
- The only query-level constraints documented on the hashtag endpoints are: 30 unique hashtags/7-day rolling window, and a "generic error for any queries that include hashtags that we have deemed sensitive or offensive." — [IG Hashtag Search](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search)
- Eligibility scoping (who gets approved, not what they can query once approved) ties allowed uses to campaign discovery, customer support, contest-entrant identification, sentiment monitoring, and audience/content-strategy management — [App Review / Feature](https://developers.facebook.com/docs/apps/review/feature)

#### Inferences
- A "challenge/contest entrant identification" use case (this product's exact scenario) falls squarely inside Meta's own listed allowed-use category ("identify entrants to its contests, competitions, or sweepstakes"), which is a positive signal for approvability, distinct from the separate question of post-approval query scope (which appears unrestricted by hashtag or account once granted).

#### Gaps
- No Meta documentation found that states approval is hashtag-specific, campaign-specific, or time-boxed to a particular review submission — but this absence of restriction language is not the same as an explicit confirmation of unlimited scope. Flagging as an open gap rather than asserting unlimited scope as fact.

---

### Q1d. Is "Instagram Public Content Access" the same gate as whatever gates mention webhooks — or separate grants with separate reviews? Which exact permission governs mention webhook delivery, and what's its Advanced Access requirement?

#### Takeaway
These are two **separate** Meta review items. Mention webhook delivery (and the `mentioned_media`/`mentioned_comment` lookup edges) is governed by the `instagram_manage_comments` permission (Facebook Login for Business path) or `instagram_business_manage_comments` (Instagram Login / Business Login path) — a **permission**, reviewed and granted independently of the "Instagram Public Content Access" **feature**, which exclusively gates the three hashtag endpoints (Q1b). There is no documentation found connecting the two into one shared gate.

#### Cited Findings
- Mentions webhook field: "The mentions field notifies you when an Instagram User @mentions you in a comment or caption on a media object that you do not own," delivering `comment_id`/`media_id`; webhooks are not sent "if the Media upon which the comment or @mention appears was created by an account that is set to private." — [Webhooks Reference: Instagram](https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram)
- `mentioned_media` edge: "returns data on an IG Media in which an IG User has been @mentioned in a caption by **another Instagram user**." Required permissions reported as `instagram_basic`, `instagram_manage_comments`, `pages_read_engagement` (plus `ads_management`/`ads_read` if the token's Page role came via Business Manager); requires a User access token with `MANAGE`, `CREATE_CONTENT`, or `MODERATE` task on the Page; mentions on Stories are not supported; webhooks won't fire for mentions on private-account media. — [Mentioned Media](https://developers.facebook.com/docs/instagram-api/reference/user/mentioned_media)
- `mentioned_comment` edge: "allows you to get data on an IG Comment in which an IG User has been @mentioned by another Instagram user" — same permission family as `mentioned_media`. — search-result-derived summary citing the Meta reference tree under [developers.facebook.com/docs/instagram-api/reference/comment/](https://developers.facebook.com/docs/instagram-api/reference/comment/) (page content obtained via search snippet, not a full direct fetch in this session — flagged as lower-confidence than the directly-fetched pages above)
- Native Tag People (`/tags` edge): "Returns a list of IG Media objects in which an IG User has been tagged by another Instagram user." Required permissions: `instagram_basic`, `instagram_manage_comments`, `pages_read_engagement` (+ `ads_management`/`ads_read` conditionally). Response implements cursor-based pagination with `before`/`after` cursors, but "notably lacks `previous` and `next` fields." Private IG Media are never returned; `media_url` is omitted in several licensing/reel-download-disabled cases. — [IG User Tags edge](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/tags)
- `instagram_manage_comments` permission (Facebook Login for Business path): "allows your app to create, delete and hide comments on behalf of the Instagram account linked to a Page," and "must be used with ADVANCED level access" once the app serves accounts it doesn't own; the permission "unlocks reading and acting on comments including comment lists on media, replies, hiding and deleting comments, and mention data." Depending on login path: Facebook Login needs `instagram_basic` + `instagram_manage_comments` + `pages_read_engagement`; Instagram Login (standalone) needs `instagram_business_basic` + `instagram_business_manage_comments`. — [search-derived from Meta permission reference tree](https://developers.facebook.com/docs/permissions/reference) (direct fetch of the specific `instagram_business_manage_comments` URL in this session resolved to unrelated Threads-permission content, likely a redirect/stale-cache issue — treat the exact permission-name mapping as search-corroborated but not independently re-verified by a clean direct fetch)
- Access Levels page, generic (applies to all permissions including `instagram_manage_comments`/`instagram_business_manage_comments`): Advanced Access "requires App Review" case-by-case and Business Verification; Standard Access restricts to "people who have a role on the requesting app." — [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels)

#### Inferences
- Because `instagram_manage_comments`/`instagram_business_manage_comments` and "Instagram Public Content Access" are documented on entirely separate reference pages with no cross-reference, and because they map to functionally distinct capabilities (comment/mention management on your own linked account's content, vs. discovering arbitrary public hashtagged content you don't own), they are almost certainly adjudicated as separate App Review submissions with separate Business Verification checks (Business Verification itself is a one-time account-level gate reused across features, so "separate Business Verification checks" means separate feature/permission review line-items under one verified Business, not literally two different verification processes).
- Getting Advanced Access + App Review approval for "Instagram Public Content Access" does **not**, by itself, unlock or imply approval for `instagram_manage_comments`/`instagram_business_manage_comments` Advanced Access for mention webhooks — these would need to be requested and reviewed independently.

#### Gaps
- Could not get a clean direct fetch of the current canonical `instagram_business_manage_comments` and `instagram_manage_comments` permission reference pages (the direct WebFetch attempt redirected into unrelated Threads-permission content, possibly due to a Meta doc site redirect or caching quirk) — the permission names and Login-path mapping above rest on search-engine snippets of the Meta documentation tree plus one third-party aggregator, not a verified clean primary-source page view in this session. Recommend the product team pull these two exact pages manually to confirm current exact wording before finalizing a go/no-go decision.
- No Meta page was found explicitly stating the Standard-vs-Advanced boundary condition for the *mentions webhook field* in so many words (see Q1a Gaps) — the "role on the app" boundary is reconstructed by inference from the general Access Levels page plus the Business Verification exception clause, not directly stated for this specific webhook field.

---

## PART 2 — HASHTAG-POLLING FEASIBILITY (ASSUMING ADVANCED ACCESS GRANTED)

### Q2a. How many results does `recent_media` expose per hashtag — documented page/overall cap? Does pagination/cursor support actually work, matching or diverging from the `/tags` edge gap the team observed in its own spike?

#### Takeaway
Meta documents a hard cap of 50 results per page for `recent_media`, with pagination limited to a forward-only "after" cursor (no "before" cursor supported) — meaning once you page forward, Meta's own docs do not promise you can page backward over the same window. This is a materially weaker pagination contract than ordinary Graph API paging, and it is close to — though not textually identical to — the "no paging object at all" behavior this team already observed on the related `/tags` edge in its own live spike.

#### Cited Findings
- "Responses are paginated with a maximum limit of 50 results per page" and "only returns an after cursor for paginated results; a before cursor will not be included." — [Recent Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media)
- Separately, the `/tags` edge (native Tag People) documents cursor-based pagination with `before`/`after` cursors but "notably lacks `previous` and `next` fields" — a different, narrower gap (fields present but no convenience wrappers) than what this team's own live spike observed for `/tags` ("NEVER returned a paging object at all despite docs claiming cursor support" — per this task's framing of the team's own first-party test result, not an external source).

#### Inferences
- The documented 50-results/page cap plus "after cursor only" for `recent_media` means that even if pagination works exactly as documented, a poller can walk forward through up to some number of pages, but Meta gives no documented guarantee of a stable "before" position to re-anchor on for incremental resumption — this is a meaningfully weaker contract than, e.g., a conventional REST `next`/`previous` cursor pair. Combined with the team's own observation that the sibling `/tags` edge sometimes doesn't return a paging object at all in practice, there is a reasonable basis to be skeptical that `recent_media`'s "after cursor" will reliably appear/work in production, even though no direct evidence (live test) exists in this research for `recent_media` specifically.

#### Gaps
- No live test of `recent_media` pagination behavior exists in this research (constrained to documentation/community review only, per task constraints) — whether `recent_media` suffers the same "paging object silently absent" gap the team found on `/tags` is an open, testable question, not something Meta's docs or community sources confirm either way. This is the single most important unresolved question for feasibility and should be spike-tested directly once Advanced Access is granted, rather than assumed from the `/tags` precedent.
- No documentation found stating an "overall" cap across all pages (e.g., "never more than N total regardless of pages") distinct from the per-page 50 limit — see Q2d below for the related volume-cap question, which is also undocumented beyond the per-page figure.

---

### Q2b. What time window does `recent_media` cover — exact wording and caveats?

#### Takeaway
Meta's own reference page states plainly that `recent_media` "only returns media objects published within 24 hours of query execution" — this is a direct quote, not a paraphrase, and the task's framing of "roughly last 24 hours" is confirmed essentially verbatim.

#### Cited Findings
- "This edge only returns public photos and videos, and only returns media objects published within 24 hours of query execution." — [Recent Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media)

#### Inferences
- A 24-hour window means a poller must hit each actively-used hashtag at least once per 24 hours (and realistically more often, given the ranking caveat in Q2c) to avoid missing posts permanently, since there is no documented way to retrieve media older than 24 hours via this edge once it ages out.

#### Gaps
- None — this point is directly and unambiguously confirmed by a Meta-primary source.

---

### Q2c. Is `recent_media` strictly chronological, or does Meta apply ranking/relevance filtering that could drop or reorder posts?

#### Takeaway
Meta's own documentation explicitly disclaims strict chronological ordering: "Responses will not always be in chronological order." This is a direct, load-bearing admission against the "recent" framing of the edge's name, and is highly relevant to reconciliation reliability.

#### Cited Findings
- "Responses will not always be in chronological order." — [Recent Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media)
- By contrast, `top_media` is explicitly rank-ordered by "a mix of views and viewer interaction using the same methodology that determines the top posts when searching for a hashtag on www.instagram.com" — [Top Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media) — confirming that Meta does apply non-chronological logic somewhere in its hashtag-content pipeline generally, which is consistent with (though not identical to) the `recent_media` ordering caveat.

#### Inferences
- A reconciliation job that assumes `recent_media` page N+1 strictly continues after page N in time, or that the first K items are always the K most recent, cannot rely on that assumption per Meta's own text. Combined with the 50-per-page cap and the forward-only cursor (Q2a), a non-chronological, capped, forward-only feed is a weak primitive for "has every submission been seen" reconciliation — the system would need its own independent completeness check (e.g., comparing against expected submitter counts) rather than trusting hashtag polling alone.

#### Gaps
- Meta's text doesn't quantify *how* non-chronological responses can be (e.g., bounded jitter vs. arbitrary reordering) — no documentation found specifying the magnitude or cause of the disordering.

---

### Q2d. Could a post "fall out" of the retrievable window before the next poll if volume is high — evidence of a fixed-size result set regardless of true volume?

#### Takeaway
Meta's documentation does not state an explicit "always capped at ~50 regardless of true volume" rule distinct from the per-page limit, but the combination of (a) a 24-hour hard cutoff, (b) a 50-result-per-page ceiling, (c) a forward-only cursor, and (d) explicitly non-chronological ordering together create real, documented risk that a post using a high-volume hashtag could become unretrievable before the next poll — this is a reasoned inference from stacked documented constraints, not a single explicit Meta statement of a volume-based drop.

#### Cited Findings
- Per-page cap and time window as cited in Q2a/Q2b above. No additional Meta documentation found describing total-result caps across all pages of a single hashtag query, or describing what happens once a hashtag has more than 50 qualifying media in the trailing 24 hours (i.e., whether all of them remain reachable via repeated pagination, or whether older/lower-priority ones become unreachable).

#### Inferences
- If ordering is non-chronological (Q2c) and only an "after" cursor exists (Q2a), a worst-case interpretation is that a given post's position in the result set is not stable across polls — a post visible on page 2 at poll time T could be excluded entirely, or appear in a position a poller already skipped, at poll time T+1, especially under a 20–500 submissions/day volume where a hashtag could plausibly exceed several times the 50-per-page figure within a day. This is the single largest reliability risk for this product's reconciliation use case and is not something Meta's documentation resolves either way — it would need direct empirical testing (outside this research's documentation-only scope) before relying on hashtag polling as a completeness guarantee.

#### Gaps
- No documentation or community report found that directly confirms or refutes a volume-based silent-drop behavior for `recent_media` specifically (as opposed to the general-purpose Instagram app's consumer hashtag-search UI, which is a different system — see Q2f). This remains the central open empirical question for the feasibility decision.

---

### Q2e. Does the "30 unique hashtags per IG User per 7-day rolling window" limit meaningfully constrain a design using 1 main hashtag + ~30 daily sub-hashtags over ~30 days (31 unique hashtags total)?

#### Takeaway
No — the limit is on **unique hashtags queried per rolling 7-day window**, not a campaign-lifetime total, and not a per-query-count limit. A design that queries 1 persistent main hashtag plus one new daily sub-hashtag per day comfortably fits: any given 7-day window would touch at most 1 (main) + 7 (that week's daily sub-hashtags) = 8 unique hashtags, well under the documented cap of 30. The cap would only bind if the design queried more than ~29 *additional* unique hashtags concurrently within any single rolling week — e.g., if sub-hashtags were not day-scoped but accumulated and were all re-queried every day regardless of age.

#### Cited Findings
- "You can query a maximum of 30 unique hashtags within a 7 day period." — [IG Hashtag Search](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search) and identically on [Recent Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media) and [Top Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media)

#### Inferences / Computation
- Design as described: 1 main hashtag (queried every day of the ~30-day campaign) + 1 new daily sub-hashtag introduced each day (30 sub-hashtags total across the month, each presumably still worth polling for some days after introduction to catch late submissions, not just on its single "assigned" day).
  - Strict reading (poll only each day's own sub-hashtag, same day): any 7-day window = 1 main + 7 daily sub-hashtags = **8 unique hashtags/week** — far under 30.
  - Generous reading (poll each sub-hashtag for its full remaining lifetime once introduced, i.e., keep polling ALL sub-hashtags introduced so far, every day): by week 4, the active set would be 1 main + up to 30 sub-hashtags = 31 unique hashtags **total over the campaign**, but the 30-unique/7-day rule is a **rolling window**, not a lifetime total — so the binding question is how many of those 31 are queried within any single rolling 7 days. If the system polls every introduced sub-hashtag every day regardless of age (i.e., by day 20 it is still polling all 20 prior sub-hashtags daily), then within one 7-day window it queries 1 main + up to 20+ sub-hashtags = could approach or exceed 30 once the campaign is ~4 weeks in. **This is where the cap could bind**, specifically only under the "keep polling all past daily hashtags forever" variant, not the "poll each day's hashtag only while fresh" variant.
  - Conclusion: the described design (1 main + ~30 daily sub-hashtags across ~30 days) fits the 7-day/30-hashtag cap comfortably **if** sub-hashtags are retired from active polling within roughly a week of introduction (consistent with the submission-reconciliation use case, since a "daily" sub-hashtag presumably only matters for a short window anyway); it risks breaching the cap **only if** the system insists on indefinitely re-polling every sub-hashtag ever introduced, all the way through the campaign.

#### Gaps
- Meta's documentation does not specify whether the "30 unique hashtags/7 days" limit is enforced per access token, per IG User ID, or per app — the phrasing is "per IG User" per third-party synthesis ([getphyllo.com](https://www.getphyllo.com/post/instagram-api-permissions-scopes)) but the Meta-primary pages fetched directly in this session say only "within a 7 day period" without explicitly naming the counting unit; this should be confirmed directly against the live Meta reference page text (it may have been elided in the fetch/summarization step) before finalizing capacity planning.

---

### Q2f. Documented or widely-reported findings about completeness/reliability problems with hashtag-based `recent_media` in production?

#### Takeaway
No community or technical-blog source was found discussing production reliability/completeness problems with the Graph API's `recent_media` edge specifically. The reliability discussion found in general web search was about the **consumer-facing Instagram app's own hashtag search UI** (the "Recent" tab being phased out, algorithmic Top/Reels-only surfacing) — a related but distinct system from the Graph API endpoint, and this distinction should not be blurred.

#### Cited Findings
- Reports exist that Instagram (the consumer app) was "testing additional current and accurate data under the 'Top' and 'Reels' tabs in hashtags for a small group, and deleting the 'Recent' tab" — i.e., Meta has signaled de-prioritizing chronological/recency-based hashtag browsing in the consumer product itself. — [Gulf News: Instagram to eliminate 'Recent tab' from hashtag search results](https://gulfnews.com/technology/media/instagram-to-eliminate-recent-tab-from-hashtag-search-results-1.1650479985801) (third-party news report, **about the consumer Instagram app's UI, not the Graph API** — flagged explicitly to avoid conflation)
- No Meta developer community forum thread, Stack Overflow thread, or technical blog post specifically describing `recent_media` or `ig_hashtag_search` dropping/missing posts in production was surfaced by search in this session.

#### Inferences
- The consumer-app trend away from chronological "Recent" hashtag browsing is suggestive — if Meta's broader hashtag-ranking infrastructure is shifting away from strict recency in the main app, that is at least directionally consistent with the Graph API's own admission that `recent_media` "will not always be in chronological order" (Q2c), i.e., both systems appear to share an underlying non-strictly-chronological hashtag pipeline. This is a plausibility inference connecting two different products, not proof that the Graph API endpoint behaves identically to the consumer app's tab.

#### Gaps
- This is the weakest-evidenced sub-question in the whole research task. The absence of community complaints about `recent_media` specifically could mean either (a) it's reliable enough in practice that nobody complains, or (b) the use case (hashtag campaign monitoring via the Graph API, requiring Advanced Access that is hard to obtain) is rare enough among developers who'd post in public forums that complaints simply haven't surfaced in indexed search results. Recommend treating this as "no evidence either way" rather than "confirmed reliable," especially in combination with the real documented gaps found in Q2a–Q2d (non-chronological ordering, 24-hour cutoff, 50/page cap, forward-only cursor) — those documented gaps are a sufficient basis for caution even without external complaint reports.

---

## Source-type legend applied throughout
- **Meta-primary (direct fetch in this session)**: Access Levels, IG Hashtag Search, Recent Media, Top Media, Business Discovery, IG User Tags edge, Business Verification, App Review/Feature pages — directly fetched and quoted in this session.
- **Meta-primary (search-snippet only, not independently re-fetched cleanly)**: Webhooks Reference: Instagram, `mentioned_media`/`mentioned_comment` edges, `instagram_manage_comments`/`instagram_business_manage_comments` permission pages — content came from search-engine summaries of Meta's own doc tree; direct WebFetch of the specific permission-reference URLs in this session returned stale/mismatched (Threads-permission) content, so exact current wording should be re-verified by a human pulling the live page.
- **Third-party/community**: getphyllo.com, saurabhdhar.com, socialsamosa.com, Gulf News — used only for corroboration/context, never as the sole basis for a permission or access-level claim, and explicitly flagged inline wherever used.
- **Inference**: reasoning performed in this research connecting cited facts to the product's specific scenario — never presented as a direct Meta claim.
