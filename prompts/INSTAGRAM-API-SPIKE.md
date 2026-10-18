# Instagram API Spike --- Challenge Curator

## Purpose

Before building the production application, prove the smallest
end-to-end Instagram integration required by Challenge Curator.

This is an **engineering experiment**, not a product implementation.
Build the minimum possible interface (or no interface at all). Prefer
scripts, API routes, logs, and a tiny diagnostic page over reusable
product architecture.

The spike should answer:

> Can Challenge Curator reliably discover eligible Instagram challenge
> submissions, retrieve usable media, process it, and publish a newly
> created credited carousel through Meta's official APIs?

Do not build the Curate / Compose / Publish product UI during this
spike.

## Product workflow being proven

1.  Organizer connects an Instagram professional account.
2.  Participant publishes an image, carousel, or Reel and mentions the
    organizer.
3.  Challenge Curator discovers the submission.
4.  It retrieves enough metadata to evaluate deterministic rules.
5.  It assigns the submission to the correct challenge/day.
6.  Organizer later selects up to 10 works.
7.  Challenge Curator obtains usable source media where Meta permits it.
8.  Media is normalized to a common carousel format.
9.  Reel audio can be removed where source video is available.
10. Challenge Curator creates a new Instagram carousel.
11. Credits follow slide order.
12. Carousel is published to the organizer account.

## 1. Authentication

Test the currently supported Meta authentication approaches applicable
to Instagram professional accounts.

Determine: - Which approach provides the required read/mention
capabilities. - Which provides content publishing. - Whether Instagram
Login alone is sufficient. - Whether a Facebook Page / Facebook Login
relationship is required for any capability. - Exact
permissions/scopes. - Which require Advanced Access / App Review outside
test/app-role accounts. - Token lifetime and refresh requirements. - Any
Business vs Creator differences.

Document the authentication flow, account type, scopes, token
type/lifetime, refresh process, review requirements, Facebook
dependencies, and observed account-type differences.

## 2. Test accounts

Use an organizer Instagram **professional account** controlled by us and
a separate participant account controlled by us.

Ideally test a public ordinary participant account and a professional
participant account if available. The participant should not be an app
administrator/developer/tester unless a test specifically requires it.

Record exact account configuration for every test.

## 3. Submission discovery

Preferred product model:

> **@mention = discovery**\
> **hashtags = validation and day assignment**

Do not make daily hashtag search the primary ingestion mechanism unless
the API forces it.

### 3.1 Caption mention

Publish an image from the participant account containing
`@challengeaccount`, `#creativeoctober2026`, and
`#creativeoctober2026_day16`.

Determine webhook/event delivery, latency, payload, media ID
availability, and whether the event can retrieve the full submission.
Save the raw webhook payload.

### 3.2 Tag vs caption @mention

Repeat using Instagram's account-tagging UI. Determine whether tags and
caption mentions produce different events/endpoints/data and whether
production should support caption mentions, tags, or both.

### 3.3 Polling/reconciliation

Determine whether submissions can also be retrieved without a webhook.
Evaluate polling as development fallback, recovery mechanism, and
periodic reconciliation. Document relevant rate limits and constraints.

## 4. Submission metadata

For every discovered submission attempt to retrieve: - media ID - media
type/product type - creator username and creator ID if exposed -
caption - timestamp - permalink - thumbnail URL - media URL where
available - carousel children where relevant

Save raw redacted API responses as fixtures.

The section passes only if we can implement mention validation, hashtag
validation, day assignment, media-type validation, original-post
linking, and creator credit.

## 5. Deterministic challenge rules

Implement a minimal local evaluator for: - required account mention -
challenge hashtag - daily hashtag - submission window - allowed media -
assigned day

No AI/LLM.

Example output:

``` text
mention: PASS
challenge_hashtag: PASS
daily_hashtag: PASS
submission_window: PASS
media_type: PASS
day: 16
eligible: YES
```

## 6. Global submission window

Do not model a challenge day only as `00:00–23:59 organizer timezone`.

Participants from eastern Australia through the US West Coast should
have approximately equal opportunity during their local calendar day.

The **daily hashtag is the primary day identifier**. Timestamp is a
sanity/eligibility check.

Implement a broad global UTC window covering the nominal calendar day
from eastern Australia through the US West Coast. Define exact
boundaries, explain the timezone extremes covered, test both boundaries
and adjacent-day overlap, and confirm the daily hashtag resolves
overlapping windows.

Production wording may be:

> **Global submission window**\
> Covers each challenge day from Australia through the US West Coast.

Do not require participant timezone knowledge. Evaluate a strict
organizer-timezone mode only as an optional alternative.

## 7. Image retrieval

Prove:

`mention → media ID → metadata → usable image`

Determine source URL availability, lifetime, download authentication,
whether it should be copied to our storage, dimensions/MIME type, and
any caching/storage restrictions.

Download an image into temporary test storage. Do not assume Instagram
CDN URLs are permanent.

## 8. Participant carousel retrieval

Publish a participant carousel with at least two images, preferably also
testing image + video.

Retrieve parent media, child IDs, child media types, child URLs where
available, and order.

Document API capabilities without deciding yet whether the future
product treats the whole carousel, first slide, or individual children
as the selectable submission.

## 9. Reel experiment --- critical

### Reel A --- original audio

Publish participant-created video with original audio, organizer
mention, and required hashtags. Retrieve metadata, permalink, thumbnail,
and video `media_url`. Download it if available.

### Reel B --- Instagram/licensed music

Publish similar video using Instagram-supplied music/audio. Repeat
retrieval and record whether `media_url` is present, omitted,
inaccessible, or otherwise restricted.

### Reel C --- downloads disabled

If Instagram exposes a participant-side Reel-download setting, publish
an otherwise eligible Reel with downloading disabled and repeat
retrieval.

### Reel D

Test any additional materially different media-rights/audio state
identified by current official documentation.

Never circumvent Meta restrictions. If Meta intentionally withholds
downloadable media, record:

`media_importable: false`

Future product behavior should allow these submissions to be ignored for
carousel creation rather than creating curator work.

## 10. Reel guidance

Verify current official Meta/Instagram documentation describing when
Reel/video source media is unavailable. Record the canonical official
URL and exact rule in the spike results.

Future product guidance will be approximately:

> Instagram may prevent Challenge Curator from importing Reels that use
> licensed music or aren't available for download. If you want Reels to
> be eligible for featured carousels, ask participants to use original
> audio and keep Reel downloads available.

Final wording must follow verified official documentation.

Also prepare copyable suggested challenge-rule text.

## 11. Video processing

For legitimately available video: 1. download 2. inspect codec/container
3. strip audio with FFmpeg 4. preserve quality where possible 5. create
publishing-compatible output 6. record dimensions, duration, codec,
container, and size

Conceptually:

``` bash
ffmpeg -i input.mp4 -c:v copy -an output.mp4
```

Transcode instead if publishing compatibility requires it.

Prove both keep-audio and remove-audio paths.

## 12. Common carousel format

Test portrait, square, landscape images, and vertical video/Reel.

Use **4:5 portrait** as the initial target unless current publishing
constraints indicate otherwise.

Prefer **fit/pad preserving the complete artwork**, not automatic
cropping.

Record source dimensions, normalized dimensions, padding behavior, and
resulting Instagram appearance. Test whether the first carousel item
determines presentation/cropping behavior for subsequent items.

## 13. Format guidance

Based on the real experiment, prepare organizer guidance approximately:

> For the best chance of being featured without cropping, submit work in
> 4:5 portrait format.

Do not finalize until behavior is confirmed.

This will later inform Settings, FAQ, generated challenge rules, and a
future prompt/rules artwork builder.

## 14. Publishing

Create a **new** Instagram carousel on the organizer account from
processed test media. Do not embed/repost the original Instagram posts.

### Carousel A

Publish 2--3 static images. Verify order, dimensions, caption, creator
mentions, and quality.

### Carousel B

Publish mixed media with at least one image and one accessible video.
Verify acceptance, playback, audio behavior, slide order, and caption.

### Carousel C

If practical, publish or successfully create/validate a carousel with
**10 children**. Confirm the current API limit rather than assuming it.

## 15. Credits

Generate credits from slide order:

``` text
1. @creator_one
2. @creator_two
3. @creator_three
```

Reorder children before publishing and confirm credits reorder
identically.

Invariant:

> **Credits always follow slide order.**

Also verify that creator @mentions in API-published captions behave
normally.

## 16. Caption constraints

Test ordinary captions, required hashtags, multiple @mentions, line
breaks, Unicode/emoji, and a caption near the current maximum length.

Record the actual limit and API error when exceeded. The prototype
assumes **2,200 characters**; verify it.

## 17. Publishing lifecycle

Document child-container creation, processing state, parent-carousel
creation, publishing call, polling/status requirements, latency, failure
states, retries, idempotency concerns, and rate limits.

Capture raw successful and failed responses.

## 18. Scheduling

Prove a minimal:

`stored publish_at → delayed/background job → create/publish carousel`

Document container expiration, whether containers should be created only
near publish time, and transient-failure retry strategy.

## 19. Professional-account requirement

Confirm supported organizer account types.

Future product copy is expected to say:

> **Challenge Curator requires an Instagram professional (Creator or
> Business) account.**

Verify that this is accurate for every API capability used and document
any Facebook Page dependency separately.

## 20. Follower verification

Confirm whether official APIs available to this application provide any
practical supported mechanism for determining whether participant X
follows the organizer.

Do not use scraping/private APIs.

If unavailable:

`follower_verification = manual`

Workflow remains:

`@creator ↗ → organizer checks Instagram → Verify`

Verification is remembered only within the current challenge instance
and does not automatically carry into duplicated/new-year challenges.

## 21. Rights and restrictions

The organizer remains responsible for permission to republish
participant work. V1 does not need a rights-management subsystem.

Clearly distinguish organizer permission from media that Meta
technically refuses to expose. Never imply organizer permission
overrides platform restrictions.

## 22. Future Challenge Rules / Prompt Builder input

The spike should produce verified guidance covering: - required
organizer @mention - challenge-wide hashtag - daily hashtag - global
submission window - supported media - Reel/original-audio
recommendation - Reel-download availability if applicable - recommended
carousel aspect ratio - republication/credit notice

This is not spike UI. Preserve findings for a later **Challenge Rules /
Prompt Builder** that can generate organizer-ready rules/prompts
artwork.

## 23. Logging

Log every API interaction with timestamp, test-case ID, endpoint,
method, API version, non-secret parameters, status, response, media ID,
relevant account IDs, latency, pass/fail, and notes.

Never commit tokens, app secrets, or credentials. Redact raw fixtures.

## 24. Deliverables

### `SPIKE-RESULTS.md`

For every test: PASS / FAIL / PARTIAL, observed behavior, endpoint,
permissions, important fields, limitations, and product implication.

### `META-SETUP.md`

Reproducible Meta setup: app type, products, login approach,
permissions, webhook subscriptions, test accounts, redirects, token
setup, App Review / Advanced Access requirements.

### `fixtures/`

Redacted JSON for image mention, tagged image, participant carousel,
original-audio Reel, licensed-audio Reel, download-disabled Reel if
testable, successful publishing-container creation, successful carousel
publish, and representative errors.

### `media/`

Temporary outputs demonstrating downloaded image, accessible Reel,
audio-stripped Reel, normalized image, and normalized video. Do not
commit participant media publicly.

### `DECISION.md`

Answer: 1. Which Meta auth path should production use? 2. What triggers
ingestion? 3. Support @mentions, tags, or both? 4. Is
polling/reconciliation required? 5. Which metadata is reliable? 6. Which
media can be imported? 7. Exactly when are Reels unavailable? 8. What
happens to non-importable Reels? 9. What output aspect ratio should V1
use? 10. Can mixed image/video carousels publish reliably? 11. Actual
caption/carousel limits? 12. Meta review/access requirements? 13. Any
blocker to the MVP?

## 25. Pass/fail criteria

### Green --- proceed

Proceed if we prove professional-account auth, participant discovery,
creator/caption/timestamp/permalink retrieval, deterministic validation,
usable image retrieval, supported Reel retrieval, graceful
identification of non-importable Reels, normalization, new-carousel
creation, mixed-media publishing, caption/credits publishing, and
sufficiently stable API behavior.

Non-importable licensed/restricted Reels are **not an MVP blocker** if
identifiable and ignorable cleanly.

### Yellow --- redesign one part

Examples: different login path required, incomplete webhook delivery
with viable reconciliation, simplified participant-carousel handling,
mandatory video transcoding, stricter format normalization.

### Red --- stop before SaaS build

Examples: participant mentions cannot be reliably discovered,
participant images cannot be retrieved through supported APIs, new
carousels cannot publish reliably, or access/review requirements make
public SaaS impractical.

Do not work around Red results with scraping, unofficial APIs, browser
automation, or undocumented private endpoints.

## 26. Non-goals

Do **not** build production database schema, final UI, billing,
onboarding, multi-tenancy, complete scheduler, prompt builder, generated
rules artwork, AI moderation, follower scraping, unofficial Instagram
integration, or production media-storage lifecycle.

The goal is **technical certainty before product implementation**.

## Final principle

> Prefer an uncomfortable verified API limitation over a convenient
> assumption.

The spike exists specifically to discover where the polished prototype
differs from what Instagram actually permits.
