# META-SETUP.md

Reproducible Meta/Instagram configuration for this spike. Scope so far: **Section 1
(Authentication)** and **Section 3 (Submission Discovery)** only.

Status: **TODO — not yet created.** Fill in the `[ ]` items as you complete them.

## App

- [ ] Meta Developer account at developers.facebook.com
- [ ] App type: **Business**
- [ ] App ID: `________`
- [ ] App Secret: stored only in Vercel project env vars + local `.env.local`, never committed

## Products (both, to compare per Section 1)

- [ ] **Instagram API with Instagram Login** added
  - [ ] Redirect URI registered: `https://<production-domain>.vercel.app/api/auth/instagram/callback`
  - [ ] Scopes requested: `instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments, instagram_business_content_publish` (verify current names on the product page — Meta renames these)
- [ ] **Facebook Login** product added (for legacy Instagram Graph API)
  - [ ] Redirect URI registered: `https://<production-domain>.vercel.app/api/auth/facebook/callback`
  - [ ] Scopes requested: `instagram_basic, instagram_manage_comments, pages_show_list, pages_read_engagement`

## Webhooks

- [ ] Instagram webhook object subscribed, field: `mentions`
- [ ] Callback URL: `https://<production-domain>.vercel.app/api/webhooks/instagram`
- [ ] Verify token: matches `WEBHOOK_VERIFY_TOKEN` env var exactly
- [ ] "Verify and Save" succeeded in the dashboard (requires the route above already deployed and live)

## App publication prerequisite (needed before Meta allows webhook testing on some app configs)

- [ ] Privacy Policy URL: `https://<production-domain>.vercel.app/privacy`
- [ ] User Data Deletion URL: `https://<production-domain>.vercel.app/data-deletion`
- Both registered in the app dashboard under App Settings → Basic

## Test accounts

| Role | Handle | Account type (Business/Creator) | Facebook Page linked? | Added as Instagram Tester? |
|---|---|---|---|---|
| Organizer | | | | |
| Participant (public ordinary) | | | n/a | |
| Participant (professional, optional) | | | | |

- [ ] Both accounts accepted the Instagram Tester invite (Instagram app → Settings → Apps and Websites → Tester Invites)
- [ ] Organizer's Facebook Page (legacy path) confirmed linked to organizer's Instagram Business account

## Deployment

- [ ] Vercel project created, linked to this repo
- [ ] Production domain noted above and used consistently as `BASE_URL` (not a preview URL — those rotate per deploy and would require re-registering redirect/webhook URIs each time)
- [ ] Env vars set in Vercel (Project → Settings → Environment Variables): `BASE_URL`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `WEBHOOK_VERIFY_TOKEN`

## Access level

- [ ] Confirmed: app remains in **Development Mode**; organizer/participant accounts work because they're added as Instagram Testers / app Admins — no App Review / Advanced Access needed for this phase
- [ ] Note here if any tested permission unexpectedly required Advanced Access even for tester accounts
