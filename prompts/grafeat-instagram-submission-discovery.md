# Grafeat — Implement Instagram Challenge Submission Discovery

You are working on **Grafeat**, a SaaS application for Instagram art-challenge organizers.

Your task is to implement a reliable submission discovery and eligibility verification pipeline using the Meta Instagram Graph API.

**Important: We have already validated the critical API behavior through real experiments. Do not repeat exploratory API testing or redesign the approach unless implementation reveals a genuine blocker.**

## 1. Product context

Grafeat helps organizers of Instagram art challenges (such as Callivember) collect submissions, verify participation rules, curate featured artwork, and eventually generate Instagram carousels with correct artist attribution.

For the initial implementation, a submission qualifies when:

1. It is a public Instagram post discoverable through the challenge hashtag.
2. It contains a genuine Instagram mention of the organizer's account.
3. Its publication timestamp falls within the configured challenge period.

Participants should **not** need to connect their Instagram accounts to Grafeat.

The organizer connects an Instagram Professional account.

## 2. Verified Meta API behavior

These findings are based on successful real-world tests, not assumptions.

### A. Hashtag discovery

Find the hashtag ID:

```http
GET /ig_hashtag_search?user_id={organizer_ig_id}&q={hashtag}
```

Retrieve candidate posts:

```http
GET /{hashtag_id}/recent_media?user_id={organizer_ig_id}&fields=id,caption,permalink,timestamp&limit=50
```

Pagination uses `paging.cursors.after`.

We successfully retrieved 400 posts across eight pages from the active `#inktober` hashtag, with further pagination available.

**Important observations:**

- Public Personal-account posts were returned without participant OAuth.
- Pagination works beyond the first few hundred results.
- Timestamps are not guaranteed to be strictly ordered across pages.
- The feed's completeness is not established.
- Do not assume a fixed maximum number of results or a guaranteed historical lookback period.

### B. Genuine mention verification

Instagram captions returned by the API may strip the `@` symbol from genuine account mentions.

Therefore, **do not verify mentions by searching caption text**.

Instead, use the tested field-expansion syntax:

```http
GET /{organizer_ig_id}?fields=mentioned_media.media_id({candidate_media_id}){id,username,caption}
```

This successfully returned mention information for posts published by independent public Personal accounts.

A successful matching result confirms a genuine mention.

Important:

- This is a field expansion on the organizer's IG account.
- `GET /{organizer_ig_id}/mentioned_media` is not the correct endpoint.
- The media ID must already be known from hashtag discovery.
- A failed request or unavailable response must not automatically be interpreted as proof of an invalid submission.

Handle verification outcomes explicitly.

### C. Existing webhook integration

Grafeat already has an Instagram webhook endpoint:

```text
/api/webhooks/instagram
```

It is subscribed to `mentions` and `comments`.

However, real posts by independent Personal accounts mentioning the organizer did not reliably trigger mention webhooks in our tests.

**Do not rely on mention webhooks as the primary discovery mechanism.**

Preserve the existing webhook implementation.

## 3. Implementation requirements

### Step 1 — Inspect the existing application

Before writing code:

- Examine the Next.js project structure.
- Identify the existing Meta authentication and token handling.
- Locate Instagram API utilities, webhook handlers, database models, background jobs, and challenge-related functionality.
- Identify existing UI components that can be reused.
- Check existing conventions for database migrations, logging, error handling, and tests.

Reuse existing infrastructure wherever possible.

Do not create duplicate services, models, or authentication mechanisms.

Briefly report the proposed implementation plan and any significant architectural conflicts before making major changes.

### Step 2 — Implement hashtag discovery

Build a reusable server-side service that:

1. Accepts a challenge configuration.
2. Resolves and stores its hashtag ID.
3. Fetches recent hashtag media.
4. Supports cursor-based pagination.
5. Persists candidate media IDs.
6. Deduplicates candidates using their Instagram media IDs.
7. Tracks scan progress and errors.

Use the challenge's actual connected organizer account and credentials.

Do not hardcode our test Instagram account or hashtag IDs into production logic.

Preserve raw publication timestamps.

Do not stop pagination solely because a post's timestamp predates the challenge period; observed results were not strictly chronological.

Implement configurable scan limits to control API usage and execution time.

### Step 3 — Implement mention verification

For each newly discovered candidate, call:

```http
GET /{organizer_ig_id}?fields=mentioned_media.media_id({media_id}){id,username,caption}
```

Determine whether the candidate genuinely mentions the organizer.

Use explicit verification states:

- `pending`
- `verified`
- `not_verified`
- `error`

Distinguish confirmed negative results from API errors, permission failures, and temporary unavailability.

Support retries for transient errors.

Avoid repeatedly verifying already confirmed candidates unless revalidation is required.

Apply challenge date eligibility separately from mention verification.

### Step 4 — Persist submission records

Adapt the existing database schema as necessary.

Store enough information to support:

- Challenge association
- Instagram media ID
- Artist username
- Caption
- Permalink
- Publication timestamp
- Mention verification status
- Date eligibility
- Discovery and verification timestamps
- Review/selection status

Use appropriate uniqueness constraints.

Avoid duplicating the same media within a challenge.

Store media metadata where available, but do not assume media URLs are permanent or that every media type is equally accessible.

### Step 5 — Incremental synchronization

Implement a repeatable synchronization process.

Requirements:

- Initial scan with pagination
- Subsequent scans that revisit an overlapping recent window
- Deduplication across runs
- Persistence of scan state
- Graceful handling of API errors and rate limits
- Ability to resume incomplete scans
- Protection against concurrent duplicate processing

Do not depend exclusively on a permanently saved pagination cursor for future scans.

Prefer the application's existing background-job or scheduling infrastructure.

If no suitable infrastructure exists, propose the smallest practical solution compatible with the current deployment.

### Step 6 — Connect the review gallery

Expose verified, date-eligible submissions through the application's existing UI.

The organizer should be able to:

- View discovered eligible submissions
- See artist attribution and Instagram post links
- Select or deselect submissions for featuring
- Manually refresh discovery
- See the latest synchronization status

Reuse existing gallery and selection functionality if available.

Do not build carousel generation or publishing as part of this milestone unless it is already implemented and requires only straightforward integration.

## 4. Reliability and security

- Keep Meta access tokens server-side.
- Never expose access tokens in browser responses, logs, or error messages.
- Never persist full `paging.next` URLs containing access tokens.
- Store only sanitized cursor values when needed.
- Handle expired tokens, permission errors, rate limits, and temporary API failures.
- Ensure authorization checks prevent one organizer from accessing another organizer's challenges or submissions.
- Avoid unbounded pagination and excessive API calls.
- Make synchronization idempotent.

Our test credentials have previously appeared in API Explorer exports. Do not reuse pasted tokens; rely on securely configured credentials.

## 5. Testing

Add tests consistent with the existing project conventions.

Cover at least:

1. Hashtag lookup
2. Cursor pagination
3. Candidate deduplication
4. Genuine mention verification
5. Confirmed negative verification
6. Transient API failures and retries
7. Date eligibility
8. Repeated synchronization without duplicates
9. Interrupted scan recovery
10. Organizer-level access isolation

Mock Meta API responses for automated tests.

Do not make live Meta API requests in CI.

## 6. Acceptance criteria

The implementation is complete when:

- An organizer can configure a challenge hashtag and date range.
- Grafeat discovers public Instagram posts through the hashtag API.
- Grafeat verifies genuine mentions using the tested field expansion.
- Eligible submissions appear in the review gallery.
- The organizer can select submissions to feature.
- Repeated scans do not create duplicate records.
- API failures are visible and recoverable.
- No participant OAuth is required.
- Existing webhook and authentication functionality remains intact.

## 7. Explicitly out of scope

Do not implement:

- Instagram carousel publishing
- AI artwork ranking
- Automatic artistic quality evaluation
- Participant OAuth
- Instagram scraping
- Unrelated UI redesign
- Broad architectural refactoring

Do not spend time trying to prove 100% hashtag coverage. We will measure discovery completeness during real challenge operation.

## 8. Working approach

Work incrementally:

1. Inspect the codebase and report the implementation plan.
2. Implement backend discovery and persistence.
3. Implement mention verification.
4. Add incremental synchronization.
5. Integrate the review UI.
6. Run tests and report results.

Follow existing coding conventions and use TypeScript throughout where appropriate.

Avoid speculative abstractions. Prefer a straightforward, maintainable implementation.

At completion, provide:

- Summary of changes
- Files created or modified
- Database migrations
- Configuration or environment variables required
- Tests executed and results
- Any remaining Meta permission or API limitations
- Instructions for manually testing the complete workflow

**Primary objective: Turn our experimentally validated Instagram API workflow into a functioning Grafeat submission collection feature, with the smallest reasonable implementation footprint.**
