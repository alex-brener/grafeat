# SPIKE-RESULTS.md

Results recorded as each test runs. Currently scoped to Section 1 (Authentication)
and Section 3 (Submission Discovery) — see `prompts/INSTAGRAM-API-SPIKE.md` for
the full test list and `META-SETUP.md` for the configuration these depend on.

For every test: PASS / FAIL / PARTIAL, observed behavior, endpoint, permissions,
important fields, limitations, product implication.

## Section 1 — Authentication

### 1a. Instagram API with Instagram Login

- Status: **PASS**
- Endpoint(s):
  - `GET https://www.instagram.com/oauth/authorize` (authorize redirect)
  - `POST https://api.instagram.com/oauth/access_token` (code → short-lived token)
  - `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token` (short-lived → long-lived token)
- Permissions granted: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_content_publish`, `instagram_business_manage_comments`
- Token type/lifetime: long-lived Instagram User access token obtained via `ig_exchange_token`; per Meta's current docs these are valid ~60 days and must be explicitly refreshed before expiry (no auto-renewal)
- Refresh process: not yet exercised in this spike — documented refresh endpoint is `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`; to verify directly in a later pass
- Facebook Page required?: **No** — this path authenticated and returned a usable long-lived token with no Facebook Page or Facebook Login involved
- Business vs Creator differences observed: not yet tested (only one account type exercised so far)
- Product implication: Instagram Login alone is sufficient for the read/comment-adjacent scopes granted here; whether it's sufficient for *discovery* (mentions/tags) specifically is being verified now in Section 3 — see the host/endpoint note under Section 3.3 below, since the token from this product is only valid against `graph.instagram.com`, not `graph.facebook.com`

### 1b. Facebook Login + Instagram Graph API (legacy)

- Status: **Setup blocker RESOLVED 2026-10-19 — permissions now granted, OAuth test not yet run.** Earlier in this same session the required permissions appeared completely unobtainable (see "resolved" trail below) — that turned out to be a wrong-entry-point problem, not a real platform gap.
- Endpoint(s): N/A — permissions just resolved; live OAuth test with correct permissions pending.
- Permissions requested/granted: `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management` now show **"Готово к тестированию"** (Ready for testing / Standard Access) in App Dashboard → Instagram API use case → Разрешения и функции, alongside the already-granted `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages`, `instagram_manage_comments`, `public_profile`. Not yet exercised via an actual OAuth grant/token.
- Token type/lifetime: not yet tested.
- Refresh process: not yet tested.
- Facebook Page dependency confirmed?: Page exists and is administered by the same Facebook account that owns the app ("The Calligrail" — confirmed present under "Pages you manage"). Actual Page↔Instagram-account link not yet confirmed via OAuth (pending).
- Business vs Creator differences observed: not yet tested.
- Product implication: pending the actual OAuth/discovery test — see corrected findings below for the setup path that worked.

#### Facebook Login setup — trail of findings, including a correction (2026-10-19)

**1. App ID/Secret and App Domains/redirect URI issues — all resolved.** `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` (from App Dashboard → Settings → Basic), `App Domains`, and the Facebook Login redirect URI were all missing/misconfigured initially and have been fixed. Not a remaining blocker.

**2. Classic Facebook Login (`scope=` param) rejects all four required permissions except one.** Our existing `start/route.ts` requests `instagram_basic, instagram_manage_comments, pages_show_list, pages_read_engagement` via the classic `www.facebook.com/dialog/oauth?scope=...` flow. Meta's OAuth dialog returned: *"Invalid Scopes: instagram_basic, pages_show_list, pages_read_engagement"* (not `instagram_manage_comments` — that one was accepted). Researched and confirmed why: these Instagram/Page business permissions are **not available through classic consumer Facebook Login at all** — they require **Facebook Login for Business**, which uses a pre-configured `config_id` instead of a runtime `scope` list. This is a real implementation gap in our existing spike code (built against the wrong OAuth flow for these permissions), not yet fixed — fix is pending resolution of point 3 below, since there's no point updating the code to use `config_id` until a configuration can actually include the needed permissions.

**3. Facebook Login for Business Configuration tool only offers `instagram_manage_comments`.** Created a Configuration (General variant, User access token type — matching our existing human-login OAuth code, not the Business System User flow). In the permissions picker, searching for `instagram_basic`, `pages_show_list`, and `pages_read_engagement` individually returned **no results for any of the three** — only `instagram_manage_comments` was available to add.

**4. Full, unfiltered Use Cases catalog reviewed — genuinely no separate "Instagram Graph API via Facebook Login" use case, but this was a dead end for the wrong reason.** Checked App Dashboard → Сценарии использования (Use Cases) → "Добавить сценарии использования," reviewed the complete list (Marketing API ×4, Threads API, MCP server for ads, Meta Audience Network, Catalog API, Messenger, Fundraiser API, Live Video API, oEmbed API, Pages API, WhatsApp, App Events) — correctly, none of these grant the needed permissions. **The mistake was assuming the Facebook Login variant had to be a separate top-level use case at all.**

**5. Correction — the Facebook Login setup lives inside the existing "Instagram API" use case, not the Use Cases catalog.** The already-configured Instagram Login use case's own setup page has a banner: *"Если вам необходимо отслеживать хэштеги и статистику, переключитесь на [API setup with Facebook login]"* — a second configuration path (left sidebar: "Настройка API для входа на Facebook") nested under the same use case, parallel to the Instagram Login setup page, not a separate catalog entry. This was missed initially.

**6. Clicking "+ Добавить" directly on the raw Permissions-and-Features catalog failed with a generic error** ("Произошла ошибка. Повторите попытку позже.") for `instagram_basic`. Not pursued further — point 7 succeeded instead, so this was likely the wrong entry point for requesting permissions (bypassing whatever the guided flow does), not a genuine rejection. Flagging as unresolved/unexplained rather than claiming to know why it failed.

**7. The guided "Настройка API для входа на Facebook" checklist succeeded.** Its own "1. Добавьте необходимые разрешения" step listed two permission sets (content management: `instagram_basic`, `instagram_content_publishing`, `pages_read_engagement`, `business_management`, `pages_show_list`; messaging: `instagram_basic`, `instagram_manage_messages`, `pages_read_engagement`, `pages_show_list`, `business_management`) with their own "Go to permissions and features" buttons. Going through **this** guided flow successfully moved `instagram_basic`, `pages_show_list`, `pages_read_engagement`, and `business_management` to "Готово к тестированию" status — confirmed directly in the Permissions-and-Features list afterward.

**Net correction:** the earlier "BLOCKED, possibly unavailable to all current apps" verdict was wrong — specifically, the inference in point 4 (that the full Use Cases catalog review proved non-availability) was based on looking in the right place for the wrong thing; the actual setup path was one click away, just not in the catalog. Recorded here exactly as it unfolded, including the wrong turn, rather than cleaned up in hindsight — consistent with documenting real investigation paths, not just final answers.

**8. Configuration completed and code fix applied (2026-10-19).** Permissions picker confirmed selectable: added `instagram_basic`, `pages_show_list`, `instagram_manage_comments`, `pages_read_engagement` (kept to this documented minimum for `mentioned_media` + `/tags` comparison; deliberately left `business_management`, `instagram_content_publish`, `instagram_manage_messages` unchecked as not needed for discovery). Also added the Instagram object's webhook subscription (separate from Instagram Login's own webhook config, found under this Configuration's "Webhooks" page → Продукт: Instagram) and subscribed the `mentions` field, using the same callback URL and `WEBHOOK_VERIFY_TOKEN` already in use. Resulting **Configuration ID: `1107651082267490`**. `start/route.ts` updated to send `config_id=1107651082267490` instead of `scope=...` on the authorize redirect — `callback/route.ts`'s token exchange step is unchanged (same `/oauth/access_token` endpoint regardless of scope vs. config_id). `tsc --noEmit` and `next build` both pass clean. Not yet deployed/tested live.

**Unrelated discrepancy noticed while reviewing the Permissions-and-Features list, flagged for later, not investigated yet:** `instagram_business_manage_comments` and `instagram_business_content_publish` both still show "+ Добавить" (not granted) in that catalog, despite being reported as granted permissions on the Instagram Login OAuth consent screen in Section 1a. The OAuth consent screen's "granted" list and this catalog's "Готово к тестированию" status do not appear to track each other 1:1. Doesn't block the current Facebook Login work; worth a closer look during a later pass on Section 1a token/permission verification.

**Next step:** deploy the `config_id` code change and run the actual Facebook Login OAuth flow via `/api/auth/facebook/start`.

## Section 3 — Submission discovery

### 3.1 Caption mention

- Status: **Test C (live webhook test): FAIL.** Documentation audit below was done first; this is the empirical follow-up.
- Webhook delivered? **No.** Latency: n/a — no delivery observed within 5+ minutes of monitoring.
- Payload fields present: n/a, nothing arrived.
- Media ID retrievable from payload?: n/a.
- Full submission retrievable from the media ID?: n/a.
- Fixture: none — nothing to save.

#### Test C — caption-mention-only post, Instagram Login webhook: FAIL (recorded 2026-10-19)

**Setup:** brand-new public feed post, separate Personal participant account, @the_calligrail in the caption only — no hashtags, no native "Tag people," no collaborator. Deliberately isolated to test caption-mention delivery specifically, with every other confound (tags, hashtags, collaborators) removed.

**App/webhook state at time of test:** app Published; Instagram Login webhook callback verified; `comments` field showed "Subscribed" in the Meta dashboard.

**Result:** monitored Vercel `/api/webhooks/instagram` logs for 5+ minutes after publishing — **no webhook POST arrived at all.**

**Conclusion for this test, stated narrowly:** under these specific, real conditions (Published app, verified webhook, `comments` field subscribed, zero code changes from what's deployed), a pure caption-only @mention from a Personal public account did **not** trigger any webhook delivery via Instagram Login's `comments` field. This directly contradicts the Instagram Platform webhooks reference's claim that mentions are "Included in the `comments` webhook notification" — at least for this caption-only case. Combined with Test B's absence from `/tags` (Section 3.2), there is now a second, independent empirical signal that Instagram Login does not deliver caption-mention events through any currently-available mechanism we've tested (webhook or polling). Not yet concluding this is impossible outright — only that neither documented path has produced a positive result for a pure caption mention under Instagram Login.

#### Documentation audit: caption-mention discovery per login path (verified 2026-10-18)

Four distinct mechanisms, checked separately for each login product. Sources cited per claim; anything not explicitly stated in a cited page is marked unconfirmed rather than inferred.

**1. Native "Tag people" → `GET /<IG_ID>/tags`**
Already tested empirically (Section 3.2, Tests A1/A2): returns `{"data":[]}` for confirmed public native tags. Per the [IG User reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/) and the [Instagram Login Mentions doc](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/), this edge only covers UI tags, not caption `@mentions`, on both hosts. Not a caption-mention mechanism either way.

**2. Caption `@mention` → `mentioned_media` edge**
Checked the edge's own reference page directly: [`.../ig-user/mentioned_media`](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_media). It shows **one single Requirements table** — Access Token: "User", Permissions: `instagram_basic`, `instagram_manage_comments`, `pages_read_engagement` (+ `ads_management`/`ads_read` if the Page role came via Business Manager), Tasks: `MANAGE`/`CREATE_CONTENT`/`MODERATE`. The example request is `GET https://graph.facebook.com/v25.0/{ig-user-id}?fields=mentioned_media.media_id({media-id}){caption,media_type}&access_token=...`. **No `graph.instagram.com` variant or Instagram-Login-specific permission set is shown anywhere on this page.** Those permissions and the "Tasks" concept (a Facebook Page role construct) only make sense under Facebook Login + Page-linked IG Business account.

**3. Comment `@mention` → `mentioned_comment` edge**
Same pattern, checked directly: [`.../ig-user/mentioned_comment`](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/mentioned_comment). Identical single Requirements table (`instagram_basic`, `instagram_manage_comments`, `pages_read_engagement`, Tasks), identical `graph.facebook.com` example request shape (keyed by `comment_id` instead of `media_id`). Again no Instagram-Login/`graph.instagram.com` variant shown.

**4. Webhook delivery — the two login paths diverge here:**

- *Instagram API with Facebook Login (`graph.facebook.com`)*: the [Instagram webhooks reference](https://developers.facebook.com/docs/graph-api/webhooks/reference/instagram) lists a dedicated **`mentions`** field: "Notifies you when an Instagram User @mentions you in a comment or caption on a media object." Its documented payload schema carries both `media_id` ("ID of media containing comment with mention") and `comment_id` ("ID of comment with mention"). The doc does not show a worked example payload and does not explicitly state how a *pure* caption mention (no actual comment) is distinguished in that schema — flagged as a gap, not resolved by inference.
- *Instagram API with Instagram Login (`graph.instagram.com`)*: the [Instagram Platform webhooks reference](https://developers.facebook.com/docs/instagram-platform/webhooks) lists `mentions` in its field table but with the description **"Included in the `comments` webhook notification"** — i.e. it is not an independently subscribable field (which matches exactly what you observed in the app dashboard UI). Per this doc, subscribing to `comments` is claimed to also deliver mention events.

**Contradiction flagged, not resolved:** the Instagram Login Mentions doc's own 4-step implementation workflow says: (1) "parse the Webhooks notifications and identify comment IDs," (2) "use the IDs to query the `GET /<IG_ID>/tags` endpoint to get more information about each comment," (3) analyze results, (4) reply via `POST /<IG_ID>/mentions`. Step 2 is inconsistent with `/tags`'s own documented purpose (tagged media only, not comment/caption lookup by ID) — either a documentation error on Meta's part, or evidence that the "comments-notification-includes-mentions" behavior is narrower than the field table implies. Not inferring which; flagging it as-is.

**`POST /<IG_ID>/mentions` is reply-only, confirmed directly from its own doc text**, not inferred: "to reply to a comment or media object caption that a Business or Creator Account has been @mentioned in by another Instagram user." No listing/query capability is described anywhere for this endpoint.

#### Net answer to "can a SaaS using each login path automatically discover a NEW public post from an arbitrary participant whose caption contains @the_calligrail?"

- **Instagram API with Facebook Login (`graph.facebook.com`) + Facebook Page linked to the organizer's IG Business account: documented chain exists end-to-end** — webhook `mentions` field fires with a `media_id` → `GET /{ig-user-id}?fields=mentioned_media.media_id({media_id}){caption,media_type,permalink,...}` using `instagram_basic` + `instagram_manage_comments` + `pages_read_engagement`. **Not yet empirically tested in this spike** (Section 1b/Facebook Login testing was explicitly deferred) — documented-but-untested.
- **Instagram API with Instagram Login (`graph.instagram.com`): unconfirmed, documentation does not show a complete path.** A webhook signal may fire (folded into `comments`), but there is no documented edge to retrieve the mentioning post's caption/media once notified — `mentioned_media`/`mentioned_comment` are only documented against `graph.facebook.com`, and the two endpoints Meta explicitly ties to Instagram-Login mentions (`/tags`, `POST /mentions`) are tag-only and reply-only respectively. This is true even though the_calligrail is a Published, Professional (verified) account — publication and account type are not the blocker here; the gap is in which edges are documented for this host/token combination at all.

No product decision is being changed based on this audit alone — Section 1b (Facebook Login) still needs to actually run before concluding Facebook Login is required for production.

### 3.2 Tag vs caption @mention

- Status: **UPDATED 2026-10-18 — Test A1 now CONFIRMED PASS** (see Test C below): a retroactively-added native tag is discoverable through `/tags`, at least eventually. Native-tag discovery via `/tags` is no longer "unconfirmed" — it demonstrably works. What remains open: (a) what triggered the transition from empty to populated (Published status / webhook config / propagation delay / something else — still not isolated), (b) whether a *brand-new* tag is discoverable promptly (pending Test A2 match), (c) whether `/tags` also surfaces pure caption mentions with no tag at all (Test B currently absent — evidence against, not proof). `/tags` remains secondary to the product (caption @mention is primary).

**Test A1** — edited an *existing* post from a separate personal Instagram account (the user's own `alexander.brener` account, separate from the organizer @the_calligrail), used Instagram's native "Tag people" UI to tag @the_calligrail. Polled `GET https://graph.instagram.com/v21.0/{organizer-ig-id}/tags` afterward — HTTP 200, `{"data":[]}` at the time. **Correction (2026-10-18):** this same post (Lake Garda, `instagram.com/p/DPqTvpLiNEt/`, original publish timestamp 2025-10-11 — that date is the media's original publication date, not when the tag was added) reappeared in the Test C poll below. **The tag was added today, specifically for this experiment; the post itself is old.** Since the post's only mentioned accounts are `@instagarda`/`@lake_garda` with nothing calligraphy-related, its appearance in `/tags` can only be explained by the native tag — this is now a **confirmed positive result**, not circumstantial: a retroactively-added native tag does eventually become visible through `/tags`.

**Test A2** — controlled for the retroactive-edit variable from A1: brand-new post, brand-new separate *Public* Personal Instagram account, audience "Everyone," tagged @the_calligrail via native "Tag people" UI *before publishing* (tag applied at publish time, not edited in). No caption @mention, no hashtags — isolated native-tag test. Polled the same endpoint after publish — HTTP 200, `{"data":[]}` again.

- Different event/endpoint/data from 3.1?: not yet determined — webhook-based caption-mention test (3.1) not yet run
- Recommendation (support captions, tags, or both): **lean toward captions as primary, per the product's original preferred model** — `/tags` polling has failed twice under documented-correct conditions (public account, tag-at-publish-time) with no error and no documented explanation. Final recommendation pending the 3.1 webhook test.
- Implementation check: our request shape matches current official docs exactly — see verification below. This is not a bug in our code.

#### Section 3.2 `/tags` investigation (documented findings, verified 2026-10-18)

Re-checked against Meta's current reference pages (not relying on the earlier pass alone):

- **Endpoint/host/permissions confirmed current and correct.** The IG User reference page's Requirements table lists, for Instagram API with Instagram Login: host `graph.instagram.com`, access token "Instagram User user access token," permission `instagram_business_basic`. The Instagram-Login "Mentions" doc additionally lists `instagram_business_manage_comments` for the `/tags` + `/mentions` pair. We have both granted. Our actual request — `GET https://graph.instagram.com/v21.0/{ig-user-id}/tags?fields=...&access_token=...` — matches this shape exactly.
- **Access level confirmed not the blocker.** The Mentions doc distinguishes "Advanced Access if your app serves Instagram Professional accounts you don't own or manage" vs. Standard Access for accounts you do own/manage. The organizer account is ours, authenticated via its own OAuth grant, so Standard Access applies — no App Review/Advanced Access gap here.
- **API version is current enough to trust the result.** We call `v21.0`. Current Graph API is `v26.0` (shipped 2026-07-29); `v21.0` deprecates 2027-01-21 but is not sunset yet — it still executes under its original contract. A deprecated-but-active version would be expected to error or warn, not silently return an empty array, so version staleness doesn't explain this. (Still worth bumping to a current version eventually — flagging as a non-blocking cleanup item, not changing it now per instruction not to make speculative changes.)
- **"Private IG Media objects will not be returned"** is documented on the `/tags` reference page as the one explicit eligibility rule — ruled out directly by Test A2's setup (new public account, audience Everyone).
- **No documented interaction between Instagram's own "Manually approve tags" privacy setting and the `/tags` API edge.** This is Instagram's native setting (Settings → Tags and mentions → Manually approve tags) that, when enabled, holds tags pending the tagged user's approval before they're attached/visible — normally described as a profile-display behavior, but Meta's API docs say nothing about whether a *pending* tag is excluded from `/tags` until approved. This is a real, undocumented gap, not an oversight on our side — and it is the most promising lead left.
- No documented requirement that the tagging account be a Business/Creator (professional) account — ruled out as a cause by Test A2 design (personal account) producing the same result as everything else so far; not the discriminator here.
- Pagination note (unrelated to the empty result but worth recording): the `/tags` edge supports cursor pagination but does not return `previous`/`next` fields.

**Smallest next diagnostic (zero-cost, no new post, no code change):** open the Instagram app as @the_calligrail and check two things in one visit: (1) does the Test A2 post actually appear under the organizer's "Tagged"/"Photos of You" view at all? (2) is Settings → Tags and mentions → "Manually approve tags" turned on — and if so, is there a pending tag waiting for approval? If a pending tag exists, approve it and re-poll `/api/discovery/poll` immediately after. This single check cleanly separates "tag never attached" from "tag attached but gated behind an undocumented approval state" without any further posts or code changes.

#### Test C — BREAKTHROUGH: `/tags` transitioned from empty to populated (recorded 2026-10-18, cause not yet determined)

**Observation, stated exactly as reported, no inference added:** after the app reached Published status and the Instagram Login webhook (`comments` field) was successfully configured and verified, re-running the *same* `/api/discovery/poll` call — same endpoint, same token, same organizer IG user ID, no code changes — returned a large set of historical media objects instead of `{"data":[]}`. Immediately prior, under identical code/endpoint/credentials, the same call returned `{"data":[]}` (Tests A1 and A2). Per the user's description, several returned items are pre-existing `#callivember` posts whose captions list @the_calligrail among featured artists, each with `id`, `caption`, `media_type`, `media_url` (where applicable), `permalink`, `timestamp`, and `username`.

**Explicitly not yet determined — do not treat any of these as ruled in or out:** whether the cause is Published status, webhook configuration/subscription, a propagation delay unrelated to either, or some other account-side state change. Multiple candidate state changes happened close together; this result does not by itself isolate which one (if any single one) is responsible.

**Open question requiring the raw response data (not yet available for inspection):** the user's description does not confirm whether the surfaced `#callivember` posts were *only* caption-mentioned, or were *also* tagged via native "Tag people." This matters because `/tags` is documented purely as "media in which an IG User has been tagged" — if these specific posts also carry a native tag (plausible for a collaborative art-challenge format where organizers are often both tagged and credited in-caption), the result would still be fully consistent with `/tags`'s documented tag-only scope, just surfacing a backlog that wasn't visible before — not evidence of caption-mention support. **Pending:** the actual JSON (or at minimum each item's `username`/`timestamp`/`permalink`) to check against Test A1/A2/B identities and timing, and a manual per-post check in the Instagram app for whether @the_calligrail shows as natively tagged on each surfaced post.

**Raw response inspected directly (2026-10-18) — 16 items, no `paging` object at all.** `body` is exactly `{"data":[...]}` with no `paging`/cursor key whatsoever — not even the documented "no previous/next" shape, just nothing. Full inventory: `alexander.brener` (2025-10-11), `ct_script` (2026-02-01), `subhajit_caligraphy` ×2 (2025-11-27, 2025-11-04), `silver_needle` (2025-11-25), `calli.__.art` (2025-08-30), `sagarthart` (2025-03-20), `vajrahast_creatives` (2024-06-23), `calligraphy_view` (2024-06-09), `calligraphy_by_saniya_08` (2024-06-06), `zunairah.calligraphy` (2024-02-22), and `callivember` ×5 (2025-11-19 "Day 16", 2025-01-01 "Day 28", 2025-01-01 "Day 27", 2024-12-31 "Day 22", 2024-11-17 "Day 13" — each a multi-artist roundup crediting @the_calligrail among 7–14 other artists).

**Decisive finding, updated 2026-10-18 with the A1 correction: this evidence points toward native-tag, not caption-mention, and A1 is now a confirmed (not circumstantial) data point for it.** 11 of the 16 items — `alexander.brener` (= **Test A1, confirmed**), `ct_script`, `subhajit_caligraphy` ×2, `silver_needle`, `calli.__.art`, `sagarthart`, `vajrahast_creatives`, `calligraphy_view`, `calligraphy_by_saniya_08`, `zunairah.calligraphy` — have captions with **zero textual mention of @the_calligrail anywhere**. `alexander.brener`/A1 is the known-ground-truth example: a Lake Garda travel post whose only @mentions are `@instagarda` and `@lake_garda`, with a native tag deliberately added today for this experiment — confirming directly, not by inference, that `/tags` can and does surface native-tag-only media with no caption mention involved. The other 10 no-caption-mention items are presumably the same mechanism (unconfirmed individually, but no longer needed as the primary evidence — A1 already proves the mechanism). This also makes it more likely the 5 `callivember` posts are present because of a native tag (standard practice for these roundup-collage posts) rather than because `/tags` parses captions, though that remains unconfirmed for those specific posts.

**Test B: absent from this response — evidence against `/tags` surfacing pure caption mentions, but not yet definitive proof**, per the user's own careful framing. Two independent, consistent signals: (a) no item in the 16 has the shape "caption-mention-only, no tag" — Test B's exact defining shape; (b) recency — the newest item returned is `ct_script` at 2026-02-01, ~8.5 months before today, and Test B is from the current, very recent experiment. Short of a confirmed count via a higher `limit` (see pagination note below) or Test B eventually surfacing on a later poll, this remains "absence consistent with the tag-only hypothesis," not a closed case.

**Test A2 — not yet identified in the 16-item list.** Per the user: A2 was a brand-new post, brand-new public Personal test account, native tag applied *before* publishing, no caption mention, no hashtags. None of the 15 non-A1 usernames are obviously a dedicated throwaway test account by name or caption style (several — `vajrahast_creatives`, `sagarthart`, `zunairah.calligraphy` — have full business signatures/contact blocks suggesting established real accounts, not fresh test accounts). Combined with the same recency gap noted for Test B (nothing newer than 2026-02-01), A2 is tentatively *not* present either — but this is not confirmed. **Needed from the user:** A2's actual handle (offered) to check definitively by exact username/permalink rather than inference.

**Pagination — answered precisely:** no `paging` object was returned at all, so there is nothing to "follow" via Meta's documented cursor mechanism — the response doesn't even offer the "no previous/next" shape the `/tags` reference page describes, it offers no paging key at all. That does **not** prove this is the complete result set: the Graph API applies a default page size regardless of whether a cursor is exposed, and our current request sends no explicit `limit`. **Smallest next diagnostic that still makes no code change:** manually call the identical Graph API URL directly (browser/curl, not through our app) with `&limit=50` or higher appended, using the real token outside of chat. If more than 16 items come back, the current view was truncated with no signal; if the same 16 come back, that's reasonably strong (not absolute) evidence this is everything.

**Resolved:** the native-tag-vs-caption-mention mechanism question that the `alexander.brener` check above was meant to settle is now closed — A1's confirmation answered it directly. **Remaining smallest next step:** get Test A2's handle/permalink from the user and check it against the 16-item list by exact match, to determine whether a *brand-new* (not retroactively-added) tag is discoverable, and on what timeline.

### 3.3 Polling/reconciliation

- Status: not yet run
- Endpoint tested:
- Works as a fallback/reconciliation mechanism?:
- Rate limits observed:
- Documented limitation to verify directly (from Meta's Instagram API with Instagram Login "Mentions" doc, not yet confirmed by our own test traffic): `GET /<IG_ID>/tags` on `graph.instagram.com` returns only UI-tagged media, not caption `@mentions`. No listing/polling edge for caption mentions is documented under either login product — caption-mention discovery appears to depend on the webhook delivering the media ID. If confirmed, this directly answers Section 3's "is polling required/possible" question for caption mentions specifically.
