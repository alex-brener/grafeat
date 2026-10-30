# Task: Audit and Update Grafeat's Privacy Policy for Meta App Review

## Context

Grafeat is a SaaS platform for organizers of recurring Instagram art challenges.

The core workflow is:

**Connect → Discover → Curate → Compose → Publish**

Organizers connect their professional Instagram accounts, discover eligible challenge submissions, select artworks, compose credited carousels, and publish them to Instagram.

Grafeat is operated by **Brener Digital LLC**, a Delaware company.

We are preparing the application for **Meta App Review**, including Instagram Public Content Access and `instagram_content_publish`.

The existing Privacy Policy is published at:

https://www.grafeat.com/privacy

The policy already provides a good foundation. **Do not rewrite it from scratch.** Preserve its structure, tone, and existing provisions wherever possible.

## Objective

Audit the existing Privacy Policy against Grafeat's actual implementation and make targeted improvements to ensure that:

1. It accurately describes the personal data Grafeat collects and processes.
2. It reflects the actual Instagram API integration.
3. It clearly explains data retention and deletion.
4. It correctly discloses third-party service providers.
5. It appropriately addresses third-party artwork and Instagram challenge participants.
6. It avoids misleading claims about user consent or data processing.
7. It is consistent with Meta's applicable Platform Terms, Developer Policies, and data-handling requirements.

**Important:** Do not invent functionality, retention periods, security measures, or legal guarantees.

---

## Step 1: Audit the Existing Implementation

Before editing the policy, inspect the relevant codebase.

Identify:

- Authentication methods and providers.
- Instagram/Facebook OAuth implementation.
- Permissions requested and actually used.
- Types of Instagram data retrieved.
- Where access tokens are stored.
- How tokens are secured and revoked.
- Database and storage providers.
- Third-party services receiving personal data.
- Logging and analytics services.
- How discovered Instagram submissions are stored.
- Whether images are downloaded, cached, or stored permanently.
- How selected artworks are processed during Compose.
- How carousel publishing works or is planned.
- Account disconnection behavior.
- Account deletion functionality.
- Data deletion procedures and retention rules.

Distinguish between:

- **Implemented and operational**
- **Implemented but incomplete**
- **Planned but not implemented**

Do not describe planned features as operational.

---

## Step 2: Improve Data Retention Disclosures

Review Section 8 (Data Retention).

The current language is relatively general.

Where supported by the implementation, clarify how long Grafeat retains:

- Organizer account information.
- Instagram OAuth access tokens.
- Discovered Instagram submissions.
- Challenge configuration and history.
- Curated selections.
- Composed carousel assets.
- Published carousel metadata.
- Logs and diagnostic information.

For each category, specify either:

- An actual retention period; or
- A clear retention criterion.

If the implementation does not establish a retention period, **flag the gap rather than inventing one**.

Check whether retention practices align with Meta's requirements.

---

## Step 3: Verify Data Deletion

Review Section 9 and the existing data deletion instructions page.

Confirm whether Grafeat supports:

1. Disconnecting an Instagram account.
2. Revoking or invalidating stored access tokens.
3. Deleting an organizer's Grafeat account.
4. Deleting associated personal data.
5. Handling Meta data deletion requests or callbacks, if applicable.

Verify the actual behavior in code.

Ensure that the policy and deletion instructions accurately describe what happens.

If deletion is manual rather than automated, state that accurately.

Do not claim immediate deletion unless the implementation guarantees it.

Flag missing functionality separately.

---

## Step 4: Audit Third-Party Service Providers

Review Section 7.

The existing policy mentions Meta and Vercel.

Inspect the codebase and deployment configuration to identify other providers that process personal data, including:

- Database hosting.
- Authentication.
- File and image storage.
- Email delivery.
- Analytics.
- Error monitoring.
- Infrastructure and logging.

Update the policy to disclose relevant providers or categories of processors.

Do not include development-only tools that do not process production personal data.

Do not expose API keys, secrets, or internal configuration values.

---

## Step 5: Clarify Third-Party Artwork and Republishing

Grafeat discovers artwork submitted to Instagram challenges and enables organizers to include selected artworks in credited carousel posts.

Review the policy and Terms of Service for clarity about:

- Publicly available Instagram content.
- Creator attribution.
- Copyright ownership.
- Permission to republish artwork.
- The organizer's responsibility for ensuring appropriate authorization.
- The distinction between public visibility and permission to reuse content.

Ensure the documents do not imply that:

- Public Instagram content is automatically free to republish.
- Grafeat owns participants' artwork.
- Grafeat automatically obtains copyright permissions through the Instagram API.
- Attribution alone necessarily authorizes republication.

Prefer placing contractual obligations in the Terms of Service and explaining relevant data processing in the Privacy Policy.

Avoid unnecessarily restrictive wording that would contradict Grafeat's intended use for organized art challenges.

---

## Step 6: Improve International Data Processing Language

Review Section 11.

The existing language suggests that participants understand international data processing merely by posting content discoverable by Grafeat.

This may be misleading because participants may not know Grafeat exists.

Replace this with a neutral, accurate disclosure describing:

- Where data may be processed.
- The involvement of international infrastructure providers.
- Relevant privacy safeguards, where actually applicable.

Do not imply that challenge participants have directly consented to Grafeat's Privacy Policy.

---

## Step 7: Verify Instagram API and Meta Compliance

Check the policy against the current production architecture.

The production integration uses **Facebook Login for Business**.

The planned Meta App Review scope includes:

- `pages_show_list`
- `instagram_basic`
- `instagram_manage_comments`
- `pages_read_engagement`
- `business_management`
- `public_profile`
- Instagram Public Content Access
- `instagram_content_publish`

Ensure that the policy accurately describes the corresponding data processing.

Pay particular attention to:

- Discovery of public Instagram content.
- Instagram account information.
- Access tokens.
- Challenge submissions.
- Creator usernames and attribution.
- Publishing content to connected organizer accounts.
- Data deletion and access revocation.

Do not describe unsupported automated likes or comments on arbitrary third-party posts as available features.

Do not add permissions or modify OAuth scopes as part of this task.

---

## Step 8: Make Minimal, Targeted Edits

Apply the necessary changes to the existing Privacy Policy and, where appropriate, the Terms of Service or data deletion instructions.

Requirements:

- Preserve the existing document structure wherever possible.
- Maintain clear, professional, accessible English.
- Avoid unnecessary legal jargon.
- Avoid broad, unsupported compliance claims.
- Keep terminology consistent across legal pages.
- Preserve existing URLs and routing.
- Do not modify unrelated application functionality.
- Do not introduce new dependencies unless essential.

Update the policy's revision date only when substantive changes are published.

---

## Step 9: Report Findings

After completing the edits, provide:

### A. Changes made

A concise table:

| Document | Section | Change | Reason |
|---|---|---|---|

### B. Implementation gaps

List discrepancies between the policy and actual functionality.

For each discrepancy, specify:

- What is missing.
- Whether it affects Meta App Review.
- Recommended corrective action.
- Priority: Critical / High / Medium / Low.

### C. Meta App Review readiness

Assess:

- Privacy Policy: Ready / Needs work
- Data deletion instructions: Ready / Needs work
- Terms of Service: Ready / Needs work
- Actual data handling: Ready / Needs work

Explain any blockers.

### D. Verification

Confirm that:

- The application builds successfully.
- Existing routes remain functional.
- The Privacy Policy is publicly accessible.
- Legal page links are correct.
- No unrelated files were changed.

---

## Important Constraints

1. **Do not invent legal or technical facts.**
2. Do not change application functionality.
3. Do not implement missing features as part of this task.
4. Do not add unnecessary legal boilerplate.
5. Do not modify Meta permissions.
6. Do not claim GDPR, CCPA, or Meta compliance without sufficient evidence.
7. Do not silently resolve implementation gaps by changing the policy to make them appear compliant.
8. Flag uncertain legal interpretations for human review.

If you identify a material issue that requires a product decision, explain it rather than making the decision yourself.

## Expected Outcome

A minimally revised, accurate, production-ready Privacy Policy, with any necessary consistency updates to related legal pages, plus a concise report identifying remaining Meta App Review blockers.
