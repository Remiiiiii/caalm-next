---
title: "IT staff guide"
description: "Operate the IT portal, support the platform, and partner with compliance owners."
section: guides
audience: "IT"
---

IT in CAALM is a dedicated operating portal — not a cosmetic role on the compliance sidebar.

## Home base

`/dashboard/it` with the IT sidebar: system overview, monitoring, CI/CD, security, database, incidents, team, settings, and more.

## How to partner with the business

Compliance owners care about renewals and evidence. You care about whether the platform is healthy enough for that work to be trustworthy.

Translate between:

| Business symptom | IT lens |
|---|---|
| “Uploads fail” | Storage, API errors, rate limits |
| “Nobody got the alert” | Notification pipeline, jobs, provider config |
| “Search is blind” | Indexing/API health |
| “Login loops” | Auth/session/2FA subsystems |

## Suggested ownership

- Watch system health and error surfaces
- Work **Active Incidents** (`/dashboard/it/incidents/active`) — load failures file themselves with an `INC-` reference
- Assign unassigned page-level failures first; acknowledge, then resolve with a note
- Keep incident history honest (active → history → post-mortem)
- Protect access control and audit log integrity
- Treat API keys and integrations as production credentials

When a user says “the page won’t load,” ask for the `INC-` reference. See [A page or table won't load](/docs/troubleshooting/page-wont-load).

## Permissions

IT permissions are explicit (`it.view_monitoring`, `it.view_incidents`, `it.manage_incidents`, `it.manage_database`, etc.). Do not assume a compliance Super Admin automatically holds IT ops keys — assign them on purpose.

Ref: [IT portal](/docs/reference/it-portal).
