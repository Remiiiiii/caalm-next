---
title: "Connect Outlook and integrations"
description: "Gmail and Microsoft 365 Mail panels, Outlook calendar sync, HubSpot origin, Salesforce setup, and org API keys with least privilege."
section: admin
audience: "Admins with integrations permission"
---

Integrations multiply power and blast radius.

## In-app mail (Gmail and Microsoft 365)

Users with mail permissions can connect a mailbox and open it from the header **envelope**. Full product walkthrough: [Mail (Gmail and Outlook)](/docs/reference/mail).

### Permissions to assign

| Key | Assign when… |
|---|---|
| `integrations.gmail.connect` | User may link Gmail |
| `integrations.gmail.manage` | User may read/send/disconnect Gmail |
| `integrations.outlook.connect` | User may link Microsoft Calendar and/or Mail |
| `settings.integrations` | User may open Billing → Integrations |

Grant only the people who should see live inbox content inside CAALM.

### Gmail (Google Cloud)

1. Create (or reuse) a Google Cloud OAuth client of type **Web application**.
2. Add authorized redirect URI matching CAALM’s Gmail callback (same host as `NEXT_PUBLIC_APP_URL`).
3. Enable the Gmail API for the project.
4. Put client ID and secret in the environment (see `.env.example` Gmail keys).
5. Users connect from **Settings → Integrations → Gmail**.

### Microsoft 365 Mail and Calendar

One Azure app registration can serve both **Calendar** and **Mail**; CAALM requests different scopes depending on which tab the user connects.

1. In [Microsoft Entra ID](https://entra.microsoft.com) (Azure AD), open **App registrations** → your CAALM app (or create one).
2. Under **Authentication**, add a redirect URI:
   - `https://<your-caalm-host>/api/auth/callback/microsoft`
   - Local: `http://localhost:3000/api/auth/callback/microsoft`
3. Under **Certificates & secrets**, create a **client secret** and copy the **Value** (not the Secret ID) into `MICROSOFT_CLIENT_SECRET`.
4. Under **API permissions** → Microsoft Graph → **Delegated**, add at least:
   - Calendar: `Calendars.Read`, `Calendars.ReadWrite`, `offline_access`, `User.Read`
   - Mail: `Mail.ReadWrite`, `Mail.Send`, `offline_access`, `User.Read`
5. Grant admin consent for the tenant if your org requires it.
6. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and tenant (`common` or your directory ID) in env.
7. In CAALM: **Settings → Integrations → Microsoft 365**:
   - **Calendar** tab → Connect for `/calendar` sync
   - **Mail** tab → Connect mail for the Outlook Mail panel

Before rolling out:

- Train owners that Mail consent can read and send mailbox data
- Decide shared calendar visibility norms
- Decide which system wins when calendar dates conflict

Demo environments may disable live sync and mail connect.

## HubSpot and Salesforce CRM origin

Full setup, pipeline, and troubleshooting (users and developers): [HubSpot and Salesforce CRM origin](/docs/admin/crm-integrations).

**HubSpot** (Growth+): Connect, pick a deal stage, draft contract when the deal hits that stage.

**Salesforce** (Enterprise): Request setup. Not self-serve OAuth until CAALM enables the org.

## API keys

- Create keys for systems, not shared humans when possible
- Scope tightly
- Rotate on staffing changes
- Never commit keys to git or chat

## Demo caution

Demo environments may disable live integrations. Validate integration behavior in a production-like org before promising executives a sync or inbox story.
