# SPIKE-RESULTS.md

Results recorded as each test runs. Currently scoped to Section 1 (Authentication)
and Section 3 (Submission Discovery) — see `prompts/INSTAGRAM-API-SPIKE.md` for
the full test list and `META-SETUP.md` for the configuration these depend on.

For every test: PASS / FAIL / PARTIAL, observed behavior, endpoint, permissions,
important fields, limitations, product implication.

## Section 1 — Authentication

### 1a. Instagram API with Instagram Login

- Status: not yet run
- Endpoint(s):
- Permissions requested/granted:
- Token type/lifetime:
- Refresh process:
- Facebook Page required? :
- Business vs Creator differences observed:
- Product implication:

### 1b. Facebook Login + Instagram Graph API (legacy)

- Status: not yet run
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
