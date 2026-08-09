---
title: "Connect Outlook and integrations"
description: "Calendar sync and org API keys with least privilege."
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

## API keys

- Create keys for systems, not shared humans when possible
- Scope tightly
- Rotate on staffing changes
- Never commit keys to git or chat

## Demo caution

Demo environments may disable live integrations. Validate integration behavior in a production-like org before promising executives a sync story.
