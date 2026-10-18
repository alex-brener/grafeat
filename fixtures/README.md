# Fixtures

Redacted raw API responses and webhook payloads, one JSON file per capture,
written by `lib/logger.ts#saveFixture`.

Files land here automatically only when running `next dev` locally — Vercel's
deployed filesystem is read-only, so for deployed webhook deliveries treat the
Vercel function logs (dashboard → project → Logs) as the source of truth and
copy the relevant redacted payload in here by hand.

Before committing: double-check nothing beyond what `redact()` already
strips (access tokens, codes, secrets) is sensitive — usernames/media IDs of
our own controlled test accounts are fine.
