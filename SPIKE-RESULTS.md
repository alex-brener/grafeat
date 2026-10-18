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

- Status: not yet run — holding per explicit instruction not to proceed to this path yet
- Endpoint(s):
- Permissions requested/granted:
- Token type/lifetime:
- Refresh process:
- Facebook Page dependency confirmed?:
- Business vs Creator differences observed:
- Product implication:

## Section 3 — Submission discovery

### 3.1 Caption mention

- Status: not yet run
- Webhook delivered? Latency:
- Payload fields present:
- Media ID retrievable from payload?:
- Full submission retrievable from the media ID?:
- Fixture: `fixtures/`

### 3.2 Tag vs caption @mention

- Status: **`/tags` polling marked EXPERIMENTALLY UNRELIABLE / UNCONFIRMED** after two failed attempts — see tests A1/A2 and investigation below. `/tags` is secondary to our product (caption @mention is primary); not spending further budget on it beyond the cheap diagnostic listed below.

**Test A1** — edited an *existing* post from a separate personal Instagram account, used Instagram's native "Tag people" UI to tag @the_calligrail (organizer). Polled `GET https://graph.instagram.com/v21.0/{organizer-ig-id}/tags` afterward — HTTP 200, `{"data":[]}`.

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

### 3.3 Polling/reconciliation

- Status: not yet run
- Endpoint tested:
- Works as a fallback/reconciliation mechanism?:
- Rate limits observed:
- Documented limitation to verify directly (from Meta's Instagram API with Instagram Login "Mentions" doc, not yet confirmed by our own test traffic): `GET /<IG_ID>/tags` on `graph.instagram.com` returns only UI-tagged media, not caption `@mentions`. No listing/polling edge for caption mentions is documented under either login product — caption-mention discovery appears to depend on the webhook delivering the media ID. If confirmed, this directly answers Section 3's "is polling required/possible" question for caption mentions specifically.
