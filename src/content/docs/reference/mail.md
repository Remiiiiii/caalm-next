---
title: "Mail (Gmail and Outlook)"
description: "Connect Gmail or Microsoft 365 Mail, open the header envelope panel, and read, compose, reply, archive, and trash without leaving CAALM."
section: reference
audience: "Everyone with mail integration permissions"
---

CAALM can open your **work inbox** in a side panel so agreement work and email stay in one place. Think of the header envelope as a mail slot on your desk: you still send and receive through Gmail or Microsoft 365; CAALM is a window into that mailbox.

Supported providers:

| Provider | Settings card | Header panel |
|---|---|---|
| **Gmail** | Gmail under Billing → Integrations | Gmail sheet |
| **Microsoft 365 Mail** | Microsoft 365 card → **Mail** tab | Outlook Mail sheet |

Calendar sync for Microsoft is separate (Calendar tab on the same Microsoft 365 card). Connecting Mail does not connect Calendar, and the reverse is also true — each consent asks for different Microsoft Graph (Microsoft’s API) scopes.

Demo sandboxes usually disable live mail connect.

## Who can use it

You need the right **permissions** (permission = a named capability assigned to your role in the database), not a special role name:

| Permission | What it unlocks |
|---|---|
| `integrations.gmail.connect` | Connect Gmail |
| `integrations.gmail.manage` | Read, send, disconnect Gmail |
| `integrations.outlook.connect` | Connect Microsoft Calendar and/or Mail |
| `settings.integrations` | Open Billing → Integrations |

If Connect is missing, ask an admin to grant the keys above. See the [permissions catalog](/docs/reference/permissions-catalog).

## Connect

### Gmail

1. Open **Settings → Billing & Integrations → Integrations**.
2. On the **Gmail** card, click **Connect**.
3. Sign in with Google and approve access (read, modify labels, compose).
4. Return to Integrations; the card should show connected.

### Microsoft 365 Mail

1. Same Integrations page → **Microsoft 365** card.
2. Switch to the **Mail** tab (Calendar is the other tab).
3. Click **Connect mail**.
4. Sign in with your work Microsoft account and approve **Mail.ReadWrite** and **Mail.Send**.
5. You should land back on Integrations with Mail connected.

Admin Azure (Microsoft cloud) app setup for business tenants: [Connect Outlook and integrations](/docs/admin/integrations#microsoft-365-mail-and-calendar).

> [!TIP]
> Use the Azure **client secret value**, not the secret **ID**. Pasting the ID causes a failed connect and a toast about an invalid secret.

## Open mail in the header

After at least one provider is connected:

1. Click the **envelope** icon in the top bar.
2. If only one provider is connected, that panel opens immediately.
3. If **both** Gmail and Outlook Mail are connected, hover the envelope and pick **Gmail** or **Outlook Mail**.

The panel is a desktop-side sheet (not a full phone layout). See [Desktop, tablet, and phone](/docs/concepts/desktop-and-mobile).

## What you can do in the panel

Both providers share the same pattern:

### Inbox

- Search the loaded page of messages
- Open a message to read HTML or plain text
- **Archive**, **trash**, **mark read / unread** (row actions and message toolbar)
- Select several messages for bulk archive, trash, or read/unread
- **Reply** opens Compose with the sender and a quoted body

Opening an unread message marks it read when the provider allows it.

### Drafts

- List drafts saved from CAALM
- Save a new draft from Compose

### Compose

- Set **To**, **Subject**, and body
- **Send** or **Save draft**
- Reply fills To / Subject and, for Outlook, replies in the Microsoft conversation thread

## Multi-provider tip

Gmail and Outlook Mail are separate vaults. Disconnecting one does not disconnect the other. Prefer one primary inbox for day-to-day work so people do not hunt for which panel has which thread.

## Security notes

- Tokens are stored per user for that provider only.
- Mail scopes are broader than calendar — only connect accounts that should be readable and sendable from CAALM.
- Disconnect from Integrations when someone leaves or no longer needs in-app mail.
- Do not treat the CAALM panel as a full Outlook or Gmail replacement (folders, rules, and advanced search stay in the provider).

## Related

- [Calendar](/docs/reference/calendar) — Microsoft calendar sync (separate from Mail)
- [Billing and integrations](/docs/reference/billing-integrations)
- [Connect Outlook and integrations](/docs/admin/integrations)
- [Notifications](/docs/reference/notifications) — CAALM’s own alert email/SMS, not your inbox panel
