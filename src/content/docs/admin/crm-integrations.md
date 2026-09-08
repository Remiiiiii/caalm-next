---
title: "HubSpot and Salesforce CRM origin"
description: "Connect HubSpot or request Salesforce, pick a pipeline stage, spawn a CAALM contract draft, and fix the usual failures."
section: admin
audience: "Admins with integrations permission, Developers"
---

CAALM can open a **draft contract** when a CRM deal (or Salesforce opportunity) hits a stage you choose. Think of the CRM as the sales doorbell; CAALM is the filing cabinet that starts a contract folder when the deal is far enough along.

**HubSpot** is self-serve on Growth and Enterprise. **Salesforce** is Enterprise-only and sales-led: you request setup; CAALM does not run Salesforce OAuth until that engagement is complete.

Requires permission `settings.integrations`. Demo sandbox disables live HubSpot connect.

## What gets created

When a deal matches your trigger stage, CAALM creates:

- A contract with `lifecycleStatus` **draft** and `status` **pending-review**
- A CRM reference like `hubspot:{dealId}`
- An origin link so the **same deal does not spawn a second draft**

Mapped fields (when HubSpot has them): deal name, amount, currency, company (vendor), CRM owner, description text that names the source deal.

Deals at or above **$50,000** are marked **High** priority; others **Medium**. Contract type is **other**. Someone still has to finish the contract in CAALM (parties, files, approvals). The CRM step only opens the draft.

## Plans and locks

| Provider | Plan | In the UI |
|---|---|---|
| HubSpot | Growth or Enterprise | **Connect HubSpot** |
| Salesforce | Enterprise | **Request setup** |
| Either | Starter | Card is locked; **View plans** |
| HubSpot | Demo sandbox | Card is locked: “Disabled in the demo sandbox.” |

If billing still shows Starter after a Growth checkout, refresh Settings → Billing before blaming HubSpot. See [Configure billing and plans](/docs/admin/billing).

---

## HubSpot: user setup

HubSpot Free CRM is enough. You do not need Marketing Hub paid for this API.

### Before you click Connect

1. You can sign in to CAALM (production or local, matching the redirect URL).
2. Workspace is Growth or Enterprise.
3. You have `settings.integrations`.
4. In HubSpot you are a **Super Admin** (or you have Marketplace access plus every scope the app asks for). Otherwise install fails with a permissions error page.

### Connect

1. Open **Settings → Billing & Integrations → Integrations**.
2. Click **Connect HubSpot**. CAALM sends you to HubSpot with a short-lived `state` cookie (10 minutes). Do not paste a raw HubSpot authorize URL; that skips the cookie and the callback fails.
3. Pick the HubSpot **portal** you mean (account picker). Installing twice in the same portal does not count as two installs.
4. If HubSpot shows **unverified app**, that is expected until marketplace review. Confirm scopes, type **I accept the risk** if asked, then **Connect app**.
5. You should land back on Integrations with HubSpot **connected**.

### Configure the pipeline and field mapping

1. Click **Configure** (or open it from the 3-dot menu when connected).
2. Pick a **pipeline** (often Sales Pipeline).
3. Pick a **trigger stage** (examples: Contract Sent, Closed Won). Only that stage creates drafts.
4. Under **Field mapping**, set HubSpot deal property internal names for contract name, amount, vendor/company, CRM owner, and close date. Defaults match standard HubSpot properties (`dealname`, `amount`, and so on). Use **Reset to defaults** if you change your mind.
5. Save.

Until a trigger stage is saved, **Sync now** stays disabled and webhooks skip the deal. Custom property names only apply after you save the mapping and run Sync now (or move a deal into the stage).

### Prove it works

**Option A — Sync now**

1. In HubSpot, put at least one deal in the trigger stage. Associate a **company** if you want vendor filled in.
2. In CAALM click **Sync now**.
3. Open Contracts and find a draft named like the deal, with CRM reference `hubspot:{dealId}`.

**Option B — Live webhook (production)**

1. Same HubSpot deal: move it **into** the trigger stage (a change, not already sitting there from before config).
2. Wait a few seconds and refresh Contracts.

Reconnect from the same card if tokens expire. **Disconnect** clears the connection for this org.

---

## HubSpot: developer setup

### Environment variables

Set these in `.env.local` (local) and the host (Vercel, etc.). Never commit secrets.

| Variable | Purpose |
|---|---|
| `HUBSPOT_CLIENT_ID` | OAuth app client ID |
| `HUBSPOT_CLIENT_SECRET` | OAuth secret; also used to verify webhooks if `HUBSPOT_WEBHOOK_SECRET` is empty |
| `HUBSPOT_REDIRECT_URI` | Must match **one** redirect URL on the HubSpot app. Local: `http://localhost:3000/api/hubspot/callback`. Production: `https://www.caalmsolutions.com/api/hubspot/callback` (or your live origin). |
| `HUBSPOT_WEBHOOK_SECRET` | Optional. Defaults to client secret for HubSpot project apps that do not show a separate webhook secret. |

Mismatch between `HUBSPOT_REDIRECT_URI` and the HubSpot app’s redirect list is the most common “callback failed” cause after a successful Connect click.

### HubSpot developer project (marketplace OAuth)

This repo’s HubSpot project lives next to CAALM (`src/app/app-hsmeta.json` in the HubSpot project), not inside `caalm-next`.

1. App `auth.type` is `oauth`. `distribution` is `marketplace`.
2. `redirectUrls` must include every URI you will use (localhost **and** production).
3. Required scopes:
   - `oauth`
   - `crm.objects.deals.read`
   - `crm.objects.companies.read`
   - `crm.schemas.deals.read`
4. After editing `*-hsmeta.json`, run `hs project upload` (and deploy if auto-deploy is off).
5. Sign the Marketplace AUP on the app **Distribution** tab before installing into accounts other than developer test portals. See [Manage apps in HubSpot](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot).

Webhooks: subscribe to `deal.propertyChange` for property `dealstage`. Target URL must be publicly reachable HTTPS, for example `https://www.caalmsolutions.com/api/webhooks/hubspot`. Localhost cannot receive HubSpot webhooks; use **Sync now** while developing locally.

### CAALM routes (what talks to what)

| Route | Who calls it | Gate |
|---|---|---|
| `GET /api/hubspot/auth` | Browser after **Connect HubSpot** | `settings.integrations`; sets `hubspot-oauth-state` cookie |
| `GET /api/hubspot/callback` | HubSpot redirect | OAuth `code` + matching `state` cookie + logged-in CAALM user |
| `POST /api/hubspot/disconnect` | Integrations card | `settings.integrations` |
| `GET /api/crm/hubspot/status` | Integrations card | `settings.integrations` |
| `GET /api/crm/hubspot/pipelines` | Configure dialog | `settings.integrations` |
| `PUT /api/crm/hubspot/config` | Save pipeline/stage/field map | `settings.integrations` |
| `POST /api/crm/hubspot/sync` | **Sync now** | `settings.integrations` |
| `POST /api/webhooks/hubspot` | HubSpot | HMAC signature (`x-hubspot-signature-v3` or v1), not a session |

Core logic: `src/lib/crm/connectors/hubspot.connector.ts`, `src/lib/crm/sync-hubspot.ts`, `src/lib/crm/create-draft-from-deal.ts`, `src/lib/crm/hubspot-webhook.ts`.

### OAuth flow (why the cookie exists)

1. Auth route builds `state` as `userId|orgId|timestamp|random` and stores it in an httpOnly cookie.
2. HubSpot redirects to `/api/hubspot/callback?code=...&state=...`.
3. Callback rejects if `state` is missing, does not match the cookie, or the user is not logged into CAALM.
4. Code is exchanged at `https://api.hubapi.com/oauth/v1/token` using the **same** `redirect_uri` as the authorize step.
5. Portal id is read from the access token and stored on the org’s HubSpot integration row.

Webhook ingest looks up the integration by **HubSpot portal id**. If OAuth never stored `portalId`, live stage changes will skip with `not_connected`.

### Pipeline after connect

```
HubSpot deal hits trigger stage
        │
        ├─ Sync now → search deals in that pipeline+stage → create drafts
        └─ Webhook dealstage change → load deal → skip if stage ≠ trigger → create draft
```

Skip conditions: config missing trigger stage; webhook stage id ≠ saved trigger; deal already has an origin link; integration status is not `connected`.

### Marketplace installs vs CAALM connect

HubSpot **Distribution** shows **installs** (OAuth consent in a portal) and **active installs** (usage HubSpot counts).

- Use **Connect HubSpot** in CAALM so the code is exchanged. A raw `oauth/authorize` URL without `state` lands on `hubspot=invalid_state` / `missing_parameters` and does **not** become an active connection in CAALM.
- HubSpot marketplace listing requires **three active, unique production installs**, unaffiliated with your org, with API activity in the last 30 days. Developer test portals and your own company portals do **not** count. See [App listing requirements](https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements).
- After a real production install, **Configure** (loads pipelines) and **Sync now** (searches deals) are the API calls that create “activity.”

---

## Salesforce: user setup

Salesforce is not a Connect button. CAALM’s connector is a mold until Enterprise setup is enabled.

1. Workspace must be **Enterprise**.
2. Settings → Billing & Integrations → Integrations → Salesforce → **Request setup**.
3. Status becomes **pending_setup**. CAALM follows up for a discovery call and **sandbox** access.
4. After CAALM enables the org, the intended pipeline is the same idea as HubSpot: opportunity stage → draft contract with `salesforce:{opportunityId}`. That OAuth path is not live until enablement.

Do not expect a Salesforce authorize screen today. If you see “Salesforce requires Enterprise and a guided setup call,” that is the product working as designed.

### Salesforce: developer notes

| Route | Role |
|---|---|
| `GET /api/crm/salesforce/status` | Whether setup was requested |
| `POST /api/crm/salesforce/request-setup` | Writes integration `status: pending_setup` |

`src/lib/crm/connectors/salesforce.connector.ts` throws `EnterpriseSetupRequiredError` on every OAuth/API method. Do not add Salesforce token exchange without the paid enablement path.

---

## Troubleshooting (users)

Work top to bottom. Fix the first match.

### Card is locked / I cannot connect

| You see | Likely cause | What to do |
|---|---|---|
| Available on Growth and Enterprise | Plan is Starter (or billing not refreshed) | Upgrade or wait for billing sync; confirm Settings → Billing |
| Disabled in the demo sandbox | You are on the demo app | Use production (or a non-demo env). See [Demo vs production](/docs/troubleshooting/demo-vs-production) |
| Permission denied | Missing `settings.integrations` | Ask an admin to grant the permission. Do not share logins. |
| View plans on Salesforce | Not Enterprise | Salesforce is Enterprise only |

### OAuth did not come back “connected”

After HubSpot, the URL on Billing & Integrations may include `hubspot=...`:

| Query | Meaning | What to do |
|---|---|---|
| `connected` | Tokens saved | Configure pipeline next |
| `oauth_error` | User cancelled or HubSpot returned `error` | Retry Connect; finish consent |
| `missing_parameters` | No `code` or `state` | Start from **Connect HubSpot**, not a bookmarked authorize URL |
| `invalid_state` | Cookie missing, expired (10 min), or mismatched | Stay on the same browser, same site (`localhost` vs production), complete within 10 minutes |
| `no_session` | Not logged into CAALM when HubSpot redirected | Log into CAALM first, then Connect again |
| `callback_failed` | Token exchange or DB write failed | Developer: check server logs `[hubspot/callback]`, client id/secret, redirect URI |

Unverified-app warning: click through only if this is **your** CAALM app. Confirm client id matches the developer project.

Wrong HubSpot portal: switch accounts in HubSpot **before** Connect, or you overwrite/reuse the same portal id.

### Connected but no draft appears

1. Confirm **Configure** saved a pipeline and trigger stage.
2. Confirm the HubSpot deal is **in that exact stage** (stage ids, not just similar labels).
3. Click **Sync now** (works without public webhooks).
4. Confirm the deal has not already created a draft (`hubspot:{id}`). Sync will reuse, not duplicate.
5. Confirm you are looking at the same CAALM org you connected.
6. For live moves: webhooks only fire on **production** HTTPS. Local `localhost` will never get HubSpot’s doorbell; use Sync now.

### HubSpot permissions error on install

The installer must hold every requested scope. A Super Admin should install.

### Duplicate or missing contracts

Same deal twice: origin link is working; open the existing draft. New deal, no row: plan contract-creation limits (`assertCanCreateContract`) can block drafts — check billing limits and the last error on the HubSpot card.

---

## Troubleshooting (developers)

### Local vs production redirect

Use one pair at a time:

- Local CAALM + `HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/callback` + that URL listed on the HubSpot app.
- Production CAALM + production callback URL listed on the same app (multiple `redirectUrls` are allowed; the **env** must match the authorize request).

`secure` on the state cookie is on in production. Mixing http production URLs will drop the cookie.

### Token and API failures

Authorize URL is `https://app.hubspot.com/oauth/authorize` (not region-specific `app-na2` for the OAuth start CAALM builds). Consent may still render on a regional HubSpot host.

Token endpoint: `POST https://api.hubapi.com/oauth/v1/token`. Pipelines: `GET /crm/v3/pipelines/deals`. Deal search: `POST /crm/v3/objects/deals/search`.

If pipelines fail after connect, refresh tokens via `getFreshHubSpotAccessToken`. Expired refresh token: user must **Connect HubSpot** again.

### Webhooks return 401 Invalid signature

`POST /api/webhooks/hubspot` verifies:

- v3: HMAC-SHA256 of `POST` + URI + body + timestamp, compared to `x-hubspot-signature-v3`. Timestamp must be within 5 minutes.
- v1 fallback: HMAC-SHA256 hex of the raw body vs `x-hubspot-signature`.

Secret is `HUBSPOT_WEBHOOK_SECRET` or `HUBSPOT_CLIENT_SECRET`. Wrong secret, truncated body, or a target URL that does not match what HubSpot signed will 401. Signature uses `request.nextUrl.pathname` (path only). If HubSpot signs the **full** public URL, align the target URL and verification URI or webhooks stay 401 while Sync now still works.

### Webhook 200 but `skipped`

| `reason` / result | Meaning |
|---|---|
| `not_stage_change` | Event is not `deal.propertyChange` / `dealstage` |
| `not_connected` | No connected HubSpot row for that `portalId` |
| `{ skipped: true }` from ingest | Trigger stage not configured, or stage id ≠ config |

Store `portalId` from token info at connect time. Test accounts have different portal ids than production.

### Signature and ingest tests

- `src/lib/crm/hubspot-webhook.test.ts`
- `src/lib/crm/hubspot.connector.test.ts`
- `src/lib/crm/create-draft-from-deal.test.ts`

### Salesforce 403 `ENTERPRISE_SETUP_REQUIRED`

Expected until the connector is enabled. Do not stub OAuth in production to “make the button work.”

---

## Security

- Least privilege: only deal/company **read** and deal schema read. Do not add write scopes unless the product needs them.
- Webhook route is unauthenticated except signature check; keep the secret in env.
- Origin links are per org + provider + external id.
- Demo must not point at production HubSpot apps with live customer portals.

Related: [Connect Outlook and integrations](/docs/admin/integrations), [Billing and integrations](/docs/reference/billing-integrations).
