# Grafeat — Final Handover Documentation Improvements

You are still in the **original Claude Code session**, with access to our development conversation and repository. This is a documentation-only task before handing development to a new session.

## Objective

Make two targeted improvements to the handover, without changing application code or expanding the implementation scope.

## 1. Preserve Meta API experimental findings

Create `docs/meta-api-experiments.md` (create `docs/` if needed) as a concise, traceable record of our Instagram/Meta API experiments.

Read and reconcile the relevant information from:
- This session's conversation history, if accessible.
- `HANDOVER.md`, especially Section 6.
- `prompts/grafeat-instagram-submission-discovery.md`.
- `SPIKE-RESULTS.md`, `DECISION.md`, and `META-SETUP.md` where relevant.
- Any existing sanitized test fixtures or logs that actually exist in the repository.

For each significant experiment, document: purpose, date if known, account/token context if known **without secrets**, Graph API request pattern (with placeholders), observed outcome, evidence source, confidence/verification status, and limitations.

In particular, preserve:
- Hashtag ID lookup through `ig_hashtag_search`.
- Cursor-based `recent_media` pagination, including the reported 400 posts across eight pages on `#inktober`, and the warning that page timestamps are not strictly ordered and completeness is unproven.
- Successful verification of genuine organizer mentions on independent public Personal-account posts through the organizer account field expansion `mentioned_media.media_id({candidate_media_id}){id,username,caption}`.
- Why caption-text matching is not an adequate substitute for genuine mention verification.
- Unreliable mention-webhook delivery for independent accounts.
- The earlier explicit Meta rejection of hashtag search pending public-content access review.
- The distinction between **experimentally working API calls** and **formally approved Advanced Access for external production customers**, which remains unknown.

**Evidence discipline:** Do not fabricate dates, response payloads, saved fixtures, screenshots, Meta approval statuses, or test conditions. If a result is documented in a brief or conversation but has no preserved raw response, label it accordingly (for example, "experimentally reported; raw response not retained in repo"). Preserve the factual outcome without claiming independent repository-level verification. If the conversation history is insufficient to reconstruct a test, mark the missing details unknown rather than guessing. Never copy live access tokens, app secrets, authorization codes, or credential-bearing `paging.next` URLs. Sanitize examples and use placeholders.

## 2. Refine `HANDOVER.md` implementation sequence

Update only the relevant passages in `HANDOVER.md` (especially Section 9) to reflect this recommended sequence:

1. Resolve architectural choices and define the **minimum viable data model**, designed for future multi-organizer support.
2. Establish database, schema/migrations, and persistence.
3. Implement production hashtag discovery and genuine-mention verification services, reusing proven API patterns rather than treating diagnostic routes as production infrastructure.
4. Implement incremental, idempotent synchronization, retries, and scan state with an explicitly chosen scheduling approach.
5. Connect real eligible submissions to an organizer review/selection gallery, reusing appropriate presentation components from the client-side demo without assuming its state management is a backend.
6. Validate the end-to-end workflow and failure cases.

Make clear that **automated tests should be introduced alongside the implementation**, not postponed until step 6. Keep the immediate product scope narrow: one real organizer and one real challenge are sufficient for the first end-to-end milestone, while the underlying schema should not unnecessarily block later multi-organizer support. This is a **recommendation**, not a previously approved architecture decision.

Add a reference from `HANDOVER.md` Section 6 to the new `docs/meta-api-experiments.md`, and ensure the document's 60-second summary remains consistent. Do not silently change existing decisions or turn recommendations into decisions.

## Boundaries and completion

- Modify **only** `HANDOVER.md` and the new `docs/meta-api-experiments.md` (plus the `docs/` directory if necessary).
- Do not change source code, environment variables, OAuth settings, Meta Dashboard configuration, or other documentation.
- Do not call live Meta APIs, expose secrets, commit, or push.
- Check the resulting documentation for internal consistency, especially evidence labels and the unresolved Advanced Access status.
- At the end, report which files changed, summarize the additions, identify any gaps that could not be resolved from existing evidence, and show `git status --short`.
- **Stop after documentation work. Do not start implementation without explicit approval.**
