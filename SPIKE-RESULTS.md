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

- Status: not yet run
- Different event/endpoint/data from 3.1?:
- Recommendation (support captions, tags, or both):

### 3.3 Polling/reconciliation

- Status: not yet run
- Endpoint tested:
- Works as a fallback/reconciliation mechanism?:
- Rate limits observed:
- Documented limitation to verify directly (from Meta's Instagram API with Instagram Login "Mentions" doc, not yet confirmed by our own test traffic): `GET /<IG_ID>/tags` on `graph.instagram.com` returns only UI-tagged media, not caption `@mentions`. No listing/polling edge for caption mentions is documented under either login product — caption-mention discovery appears to depend on the webhook delivering the media ID. If confirmed, this directly answers Section 3's "is polling required/possible" question for caption mentions specifically.
