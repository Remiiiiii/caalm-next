---
title: "Connect Outlook and integrations"
description: "Calendar sync, HubSpot origin, Salesforce setup, and org API keys with least privilege."
section: admin
audience: "Admins with integrations permission"
---

Integrations multiply power and blast radius.

## Outlook

Requires `integrations.outlook.connect` / `sync` (and broader manage permissions as applicable).

Before connecting:

- Train calendar owners
- Decide shared calendar visibility norms
- Decide which system wins when dates conflict

## HubSpot CRM origin (Growth and Enterprise)

Creates a CAALM draft contract when a HubSpot deal enters a stage you pick. HubSpot **Free CRM** is enough — the API is included.

Requires `settings.integrations` plus a **Growth or Enterprise** workspace.

### Prerequisites (CAALM)

1. Workspace on Growth or Enterprise (Settings → Billing).
2. Your user has `settings.integrations`.
3. CAALM env has HubSpot OAuth credentials: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI`, and `HUBSPOT_WEBHOOK_SECRET`.

### HubSpot developer app

1. Open [HubSpot Developers](https://developers.hubspot.com/) and create an app.
2. On the Auth tab, add redirect URL `{APP_URL}/api/hubspot/callback`.
3. Scopes: `crm.objects.deals.read`, `crm.objects.companies.read`, `crm.schemas.deals.read`.
4. Copy the Client ID and Client Secret into CAALM env.
5. On the Webhooks tab (production), subscribe to `deal.propertyChange` for property `dealstage`. Target URL: `{APP_URL}/api/webhooks/hubspot`.

### Connect in CAALM

1. Settings → Billing & Integrations → Integrations.
2. Click **Connect HubSpot** and approve OAuth.
3. Click **Configure** and pick the pipeline plus trigger stage (for example "Contract sent" or "Closed Won").
4. Click **Sync now**, or move a test deal into that stage.
5. Confirm a draft appears in CAALM with CRM reference `hubspot:{dealId}`. The same deal does not spawn a second draft.

Reconnect from the same card if tokens expire.

## Salesforce CRM origin (Enterprise, sales-led)

Salesforce is not self-serve. Enterprise orgs request setup from the Salesforce card. CAALM enables the connector after a discovery call and sandbox access. No Salesforce OAuth runs until that engagement.

## API keys

- Create keys for systems, not shared humans when possible
- Scope tightly
- Rotate on staffing changes
- Never commit keys to git or chat

## Demo caution

Demo environments may disable live integrations. Validate integration behavior in a production-like org before promising executives a sync story.
