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

Demo environments may disable live integrations. Validate integration behavior in a production-like org before promising executives a sync story.
