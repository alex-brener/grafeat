# Challenge Curator — Diagnose Failed Test D2

Test D2 has now **FAILED**.

Do not proceed to App Review yet. Before changing architecture or permissions, diagnose why the Facebook Login `mentions` webhook did not fire even when the participant was added as an Instagram Tester.

## Context

We tested:

- Organizer: `@the_calligrail`
- Participant: `@cc_spike_participant`
- Participant was added as an Instagram Tester/app-role account and accepted the invitation.
- Instagram required the participant to become a Creator professional account to accept the tester role.
- We then published a **brand-new feed post** from that participant.
- Caption contained `@the_calligrail`.
- No hashtag.
- No native Tag People.
- No collaborator.
- We monitored the existing webhook endpoint/logs.
- No `mentions` webhook event arrived.

Therefore D2 did **not** confirm the hypothesis that the earlier Test D failed only because the participant was a non-role-holder.

Important: D2 has a confound because the participant changed from Personal → Creator while also becoming a Tester. But because the result is negative anyway, neither change solved webhook delivery.

---

# Goal

Determine why D2 failed and identify the **smallest next diagnostic action**.

Do **not** assume we need Advanced Access yet.

Do **not** modify product requirements.

Do **not** change the Challenge Curator participation mechanic.

Do **not** start App Review.

Do **not** write more application code until you have audited the existing Meta configuration and current official documentation.

---

# 1. First verify that our interpretation of Meta's tester/role rules is correct

Using current official Meta documentation, establish precisely what Meta means when it says Standard Access allows testing with app-role users.

Specifically determine:

- Does an **Instagram Tester** qualify for webhook events under Standard Access?
- Or does the participant need some different Meta app role?
- Is an Instagram Tester sufficient for a Facebook Login for Business / Instagram Graph API webhook?
- Does the participant also need to be:
  - Facebook App Tester?
  - Developer?
  - Admin?
  - associated with the Business Portfolio?
  - associated with the Facebook Page?
  - associated with the Instagram professional account?
- Does the organizer need an app role?
- Does the mentioned account need an app role?
- Does the *author of the mentioning post* need an app role?
- Are roles different between:
  - Instagram API with Instagram Login
  - Instagram API with Facebook Login
  - legacy Instagram Graph API
  - Facebook Login for Business?

This distinction is critical.

Do not rely on generic statements like “app-role users work in development mode.” Determine exactly which role applies to **this specific `mentions` webhook product/API path**.

---

# 2. Audit whether we're subscribed to the correct webhook object and field

Do not assume the existing webhook configuration is correct merely because Meta accepted the callback URL.

Determine the exact current configuration required for:

> User publishes an Instagram feed post whose caption contains `@the_calligrail`.

We need to know:

- Which webhook **object** should the app subscribe to?
- Which webhook **field** should be subscribed?
- Is the correct field literally `mentions`?
- Is `mentions` still supported in the current API version?
- Is it under the Instagram object, Page object, or another object?
- Does this differ between Instagram Login and Facebook Login?
- Does caption mention generate the same event as comment mention?
- Does a caption mention create an event only for certain media/account types?

Compare the official documentation against our actual Meta dashboard configuration.

If possible, inspect the existing project/config/docs to reconstruct what we configured during Test D.

Produce:

**Required configuration → Our configuration → Match / mismatch / unknown**

---

# 3. Check account-level webhook subscription

This is especially important.

Determine whether configuring the webhook callback + subscribing the app to the `mentions` field is sufficient, or whether we must separately subscribe the organizer's Page/Instagram account to the app.

Investigate current equivalents of mechanisms such as:

- `/{page-id}/subscribed_apps`
- Instagram account subscriptions
- Page access-token subscription calls
- `subscribed_fields`
- app-level vs account-level webhook subscription

Answer explicitly:

> Is there an API call we were supposed to make after OAuth to subscribe `@the_calligrail` / its Facebook Page to webhook delivery?

If yes:

1. identify the exact endpoint;
2. identify required token type;
3. identify required permissions;
4. show how to inspect the current subscription;
5. explain whether our existing code ever performs this step.

This is one of the highest-priority hypotheses.

---

# 4. Verify the Facebook Page ↔ Instagram organizer connection

Because we're testing the **Facebook Login** mentions path, audit the complete identity chain:

```text
Meta App
    ↓
Facebook user
    ↓
Facebook Page
    ↓
Instagram Professional account
    ↓
@the_calligrail