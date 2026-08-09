---
title: "Permissions catalog"
description: "Every major permission key in plain language — the dictionary behind CAALM access."
section: reference
audience: "Admins, Security, Everyone"
---

This catalog explains permission keys in everyday language. Exact availability can depend on your org’s role configuration.

## Calendar

| Key | Meaning |
|---|---|
| `calendar.view_own` | See your own calendars |
| `calendar.view_team` | See team calendars |
| `calendar.view_all` | See org-wide calendars |
| `calendar.create` | Create calendars |
| `calendar.edit_own` / `edit_all` | Edit calendars you own / any |
| `calendar.delete_own` / `delete_all` | Delete calendars you own / any |

## Events

| Key | Meaning |
|---|---|
| `events.create` | Create events / related tasking |
| `events.invite` | Invite people to events |
| `events.approve` | Approve event requests |
| `events.reschedule` | Move events |
| `events.cancel` | Cancel events |

## Contracts

| Key | Meaning |
|---|---|
| `contracts.view` | Browse contract records |
| `contracts.create` | Create/upload contracts |
| `contracts.edit` | Change contract metadata/files |
| `contracts.review` | Enter review workflows |
| `contracts.approve` | Approve contract proposals |
| `contracts.sign` | Sign where enabled |

## Licenses

| Key | Meaning |
|---|---|
| `licenses.view` | Browse licenses |
| `licenses.create` | Create licenses |
| `licenses.edit` | Edit licenses |
| `licenses.delete` | Delete licenses |
| `licenses.allocate` | Allocate licenses |
| `licenses.renew` | Perform renewals |

## News

| Key | Meaning |
|---|---|
| `news.read` | Read company news |
| `news.create` | Draft articles |
| `news.update` | Edit articles |
| `news.publish` | Publish articles |
| `news.delete` | Delete articles |

## Users

| Key | Meaning |
|---|---|
| `users.view` | View users |
| `users.invite` | Send invites |
| `users.edit` | Edit users |
| `users.assign_roles` | Change role assignments |
| `users.deactivate` | Deactivate users |

## Settings & integrations

| Key | Meaning |
|---|---|
| `settings.view` | View settings |
| `settings.edit` | Edit org/system settings |
| `settings.billing` | Manage billing |
| `settings.integrations` | Manage integrations |
| `integrations.outlook.connect` | Connect Outlook |
| `integrations.outlook.sync` | Sync Outlook |
| `integrations.manage` | Broader integration management |

## AI

| Key | Meaning |
|---|---|
| `ai.chat` | Use assistant chat |
| `ai.document_analysis` | Analyze documents with AI |
| `ai.meeting_prep` | Meeting prep assistance |
| `ai.image_generate` | Generate images |

## Audit

| Key | Meaning |
|---|---|
| `audit.view` | View audit information |
| `audit.export` | Export audit information |

## IT

| Key | Meaning |
|---|---|
| `it.view_rate_limits` | Inspect rate limits |
| `it.view_system_logs` | View system logs |
| `it.manage_api_keys` | Manage API keys |
| `it.view_analytics` | View IT analytics |
| `it.manage_deployments` | Manage deployments |
| `it.view_monitoring` | View monitoring |
| `it.manage_ci_cd` | Manage CI/CD |
| `it.view_security` | View security surfaces |
| `it.manage_database` | Database administration |
| `it.view_incidents` | View incidents / on-call / post-mortems |

> [!IMPORTANT]
> Grant keys through roles stored in the database. Do not invent code bypasses for “special” people.

Related concepts: [Permissions](/docs/concepts/permissions), [Design a permission model](/docs/admin/permission-model).
