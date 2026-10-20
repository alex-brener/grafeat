# Challenge Curator --- Instagram Submission Discovery Research Brief

## Purpose

Stop implementation and testing for now. Do **not** run Test D2 and do
**not** make further code changes.

We have become too focused on webhook delivery. The actual product
requirement is not:

> "Receive a webhook when someone mentions the organizer."

It is:

> **Given a challenge organizer account such as `@the_calligrail`,
> automatically or semi-automatically obtain the public Instagram posts
> that are submissions to its challenge.**

A valid submission normally contains:

-   `@the_calligrail` in the caption
-   challenge hashtag, e.g. `#callivember2026`
-   daily hashtag, e.g. `#callivember2026_day07`

Before any more experiments, perform a deep research pass on all viable
discovery mechanisms.

------------------------------------------------------------------------

## 1. Enumerate every possible discovery mechanism

For the **current Meta/Instagram APIs**, investigate every supported way
to discover or enumerate posts from arbitrary public Instagram users,
including:

-   caption `@mentions`
-   native **Tag People**
-   hashtag search / `recent_media`
-   Mentions API / `mentioned_media`
-   webhooks
-   polling / account-level edges
-   Business Discovery
-   comments / mentions endpoints
-   notifications / activity APIs, if any
-   Instagram Login vs Facebook Login
-   any other official Meta mechanism we have overlooked

For every mechanism, make a strict distinction between:

### DISCOVERY

Can the mechanism give us media IDs/posts we did **not already know**?

### LOOKUP

Can the mechanism only retrieve information **after we already know a
media ID**?

Do not conflate these.

------------------------------------------------------------------------

## 2. Document access requirements for every discovery mechanism

Build a comparison matrix containing at least:

  Question                                              Required
  ----------------------------------------------------- ----------
  Mechanism                                             Yes
  What can be discovered                                Yes
  Personal participant accounts supported?              Yes
  Public Professional participant accounts supported?   Yes
  Organizer requirements                                Yes
  Facebook Page required?                               Yes
  Standard Access works?                                Yes
  Advanced Access required?                             Yes
  Instagram Public Content Access required?             Yes
  App Review required?                                  Yes
  Business Verification required?                       Yes
  Real-time/webhook or pull/poll?                       Yes
  Pagination/history limits                             Yes
  Rate limits                                           Yes
  Captions returned?                                    Yes
  Username returned?                                    Yes
  Media URL returned?                                   Yes
  Permalink returned?                                   Yes
  Suitability for Challenge Curator                     Yes

Use **current official Meta documentation as the primary source**.

Clearly distinguish:

-   confirmed current Meta documentation
-   empirical findings from our spike
-   old/deprecated Meta documentation
-   third-party documentation
-   inference/hypothesis

Do not present inference as fact.

------------------------------------------------------------------------

## 3. Investigate the exact pull-based mentions question

Determine whether there is currently **any official mechanism** that
lets an authorized application periodically ask something equivalent to:

> **"Give me posts that recently mentioned `@the_calligrail`."**

The application must not already know the media IDs.

Investigate thoroughly whether `mentioned_media` or any related
functionality has:

-   an enumerable/list form
-   an account-level edge
-   pagination
-   cursor/history
-   search operation
-   notification history
-   activity endpoint
-   another endpoint capable of supplying the media IDs first

Do **not** assume our existing `mentioned_media` implementation exhausts
the API.

End this section with an explicit answer:

**Can caption mentions currently be pulled/polled as a list through an
official Meta API?**

If no, explain exactly what the official API does expose instead.

------------------------------------------------------------------------

## 4. Investigate hashtag polling as an alternative discovery architecture

We empirically established that `ig_hashtag_search` is gated by
**Instagram Public Content Access**. This was a **BLOCKED** test, not a
failed capability test.

Investigate what becomes possible **after an app receives the required
access**.

Evaluate this pipeline:

``` text
#challenge
    ↓
ig_hashtag_search
    ↓
hashtag ID
    ↓
recent_media
    ↓
candidate media IDs/posts
    ↓
inspect caption for @organizer
    ↓
inspect challenge hashtag
    ↓
inspect daily hashtag
    ↓
validate timestamp/window
    ↓
Challenge Curator submission
```

If useful, also evaluate whether the returned media ID can then be used
with the already-working `mentioned_media` lookup to obtain additional
metadata.

### Completeness is critical

Do not merely establish that hashtag search technically returns posts.

Determine whether it can realistically serve as Challenge Curator's
ingestion mechanism.

Specifically investigate:

-   How many results can `recent_media` expose?
-   Is it a fixed/truncated set?
-   Is pagination available?
-   How far back does it go?
-   Does polling more frequently prevent submissions from being missed?
-   If a challenge receives 20 submissions/day, is it safe?
-   50/day?
-   200/day?
-   500/day?
-   Could posts disappear from the retrievable result window before the
    next poll?
-   Are results chronological?
-   Are there ranking/top-media effects?
-   What happens when the same challenge hashtag is used heavily outside
    the challenge?
-   Does the 30-unique-hashtags/7-days restriction matter for our
    challenge model?

We need to know whether hashtag polling is merely **possible** or
genuinely **reliable enough for ingestion/reconciliation**.

------------------------------------------------------------------------

## 5. Reverse-engineer current commercial precedent

Research current 2026 behavior and documentation for:

-   Easypromos Mention + Hashtag
-   Mention.com Instagram monitoring
-   Woobox
-   ShortStack
-   Gleam
-   Brandwatch
-   other current products that automatically collect Instagram UGC by
    hashtag and/or `@mention`

For each product determine, where evidence exists:

  Question                                                  Research
  --------------------------------------------------------- ----------
  What exact participant action is required?                
  Caption `@mention` supported?                             
  Hashtag collection supported?                             
  Native Tag People required/supported?                     
  Ordinary Personal participant accounts supported?         
  Professional participant account required?                
  Organizer must have Professional Instagram?               
  Organizer must connect Facebook Page?                     
  Collection real-time or polling?                          
  Historical/backfill collection available?                 
  Claims to use official Meta API?                          
  Evidence of Meta Advanced Access/Public Content Access?   
  Evidence of another partner/data provider?                
  Known completeness limitations?                           

Do **not** infer an implementation merely because a feature exists.

Separate:

**Documented fact**\
from\
**Likely architecture / hypothesis**.

### Easypromos is especially important

Its current documentation claims automatic real-time collection of
public posts containing an `@mention` + hashtag.

Explain how that functionality can coexist with the restrictions we
encountered.

Possible explanations should be investigated rather than assumed,
including:

-   Advanced Access
-   Instagram Public Content Access
-   Facebook Login/Page-linked architecture
-   Meta partner/approved application status
-   another ingestion mechanism

### Mention.com is also important

Determine whether its Instagram keyword/caption monitoring is
implemented through ordinary Instagram Graph API functionality or
through a different commercial data-acquisition layer.

If the upstream mechanism cannot be established publicly, say so
explicitly.

------------------------------------------------------------------------

## 6. Separate Instagram UI capability from API capability

Document how a challenge organizer can manually find submissions today
**inside Instagram itself**, including:

-   notifications generated by caption `@mentions`
-   native tagged-post/profile tab
-   hashtag search/browse
-   search
-   any other relevant Instagram UI

Then map each human action to the equivalent third-party API capability,
if one exists.

Example structure:

  Human Instagram workflow        Third-party API equivalent   Access gate
  ------------------------------- ---------------------------- -----------------------
  See that someone mentioned me   ?                            ?
  Open tagged posts               `/tags`?                     ?
  Search `#challenge`             `ig_hashtag_search`?         Public Content Access
  Open a known post               media lookup?                ?

The fact that Instagram's own first-party application lets a human
search or browse something **does not mean Meta exposes the same search
capability to third-party applications**.

Make this distinction explicit.

------------------------------------------------------------------------

## 7. Evaluate viable Challenge Curator ingestion architectures

Do not end with another isolated API test.

End with a comparison of viable **product architectures**, including at
minimum:

### A. Advanced Access caption-mention webhook

``` text
participant posts
→ @organizer mention
→ Meta webhook
→ Challenge Curator
```

### B. Public Content Access hashtag polling

``` text
cron
→ challenge hashtag
→ recent public media
→ validate @mention + daily hashtag + date
→ Challenge Curator
```

### C. Hybrid webhook + hashtag reconciliation

``` text
webhook = fast primary ingestion
hashtag polling = periodic reconciliation/backfill
```

### D. Native Tag People + `/tags`

The path already empirically confirmed in Test A1.

### E. Commercial social-listening/data provider

For example, a provider capable of monitoring public Instagram captions.

### F. Manual/semi-manual import

Examples:

-   organizer pastes Instagram post/Reel URL
-   organizer uses Share/Copy Link → Challenge Curator
-   browser extension/share-sheet concept if relevant

### G. Any other viable architecture discovered during research

For every architecture provide:

-   participant UX
-   organizer UX
-   technical dependencies
-   Meta permissions/review requirements
-   reliability/completeness
-   latency
-   expected scale limitations
-   implementation complexity
-   third-party dependency
-   estimated suitability for Alpha
-   estimated suitability for production
-   what remains unknown
-   what must actually be proven

------------------------------------------------------------------------

## 8. Re-evaluate the existing spike evidence carefully

Preserve all empirical results.

Current important findings include:

-   Native **Tag People → `/tags`** has worked empirically.
-   Caption-only mention did not appear through `/tags`.
-   Instagram Login `comments` webhook did not deliver the external
    Personal-account caption mention under our current access.
-   Facebook Login dedicated `mentions` webhook did not deliver the
    external Personal-account caption mention under our current access.
-   `mentioned_media` lookup works when a media ID is already known.
-   `ig_hashtag_search` returned an explicit **Instagram Public Content
    Access** gate.
-   Current testing has been performed without the production
    Advanced/Public Content access required for arbitrary external
    public content.
-   Therefore the negative webhook tests must not automatically be
    interpreted as proof that the production capability does not exist.

Do not erase or rewrite negative results. Separate:

**what failed empirically**\
from\
**why it may have failed**\
from\
**what remains untested because of an access gate**.

------------------------------------------------------------------------

## 9. Answer the central product question

The research report must ultimately answer:

> **Can Challenge Curator reliably obtain public Instagram challenge
> submissions from ordinary participants without requiring them to use
> an unnatural participation mechanic?**

The preferred participant behavior remains:

``` text
publish normal Instagram post/Reel
+ caption @mention of challenge organizer
+ challenge hashtag
+ daily hashtag
```

Do not change this requirement merely because native Tag People is
easier technically.

If the preferred behavior requires Meta App Review/Advanced Access,
state that clearly.

If it cannot be supported reliably even with approved production access,
establish that with evidence before recommending a product-rule change.

------------------------------------------------------------------------

## 10. Deliverable

Return a standalone research report first.

It should contain:

1.  Executive conclusion
2.  Official Meta discovery-mechanism map
3.  Discovery vs lookup matrix
4.  Access/permission matrix
5.  Pull-based mention investigation
6.  Hashtag-polling feasibility analysis
7.  Commercial competitor implementation evidence
8.  Instagram UI vs third-party API comparison
9.  Candidate Challenge Curator architectures
10. Remaining unknowns
11. Recommended next decision
12. Only then: the smallest next empirical test(s), if still necessary

### Important constraints

-   **Do not modify code.**
-   **Do not run Test D2.**
-   **Do not start App Review.**
-   **Do not update `DECISION.md` or `SPIKE-RESULTS.md` yet.**
-   Do not propose another test until the research is complete.
-   Prefer current official Meta documentation.
-   Cite sources/URLs for all important API claims.
-   Clearly label documented facts versus hypotheses.
-   Treat current Standard Access limitations as access gates, not proof
    of production API impossibility.

The purpose of this research is to decide the **correct ingestion
architecture**, not to make one particular webhook implementation
succeed.
