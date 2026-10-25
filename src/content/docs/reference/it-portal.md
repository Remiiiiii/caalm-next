---
title: "IT portal"
description: "Monitoring, security, CI/CD, database, load incidents, and platform operations."
section: reference
audience: "IT"
---

The IT portal is a full second navigation world for platform operations.

## Major areas

- System overview & storage
- Monitoring (API analytics, health, performance, errors, infrastructure, network, application)
- CI/CD (pipelines, builds, deployments, releases, quality)
- Development (repositories, issues, code analysis, CLM Roadmap, Nonprofit Roadmap, PR log)
- API management & documentation
- Security (dashboard, audit logs, compliance, access control, incident response)
- Database (performance, health, schema, queries)
- Logs & traces
- Incident management (active load errors, history, on-call, post-mortems, runbooks)
- IT team directory/roles/departments
- Automation jobs
- IT settings (system, notifications, integrations, backup)

## Load incidents (live)

When a signed-in user hits a **couldn't load** screen, CAALM files an incident for you. Users do not have to remember to open a ticket.

Route: **`/dashboard/it/incidents/active`**

What you get on each incident:

- A reference like `INC-7F3A92` (users can copy this)
- Scale: page, section, table, or refresh banner
- Route, error status/code, and how many times it happened
- How many distinct users hit it
- A screenshot of the failed region (sensitive fields are masked before capture)
- Assign, acknowledge, resolve — and undo resolve if you closed it too early

Same page + same element + same error **fingerprint** into one open incident. A resolved fingerprint that comes back opens a **new** incident and links `reopenedFrom` instead of silently reusing the old row.

Headline cards on Active Incidents:

- New / acknowledged / reopened
- Unassigned, including how many are past the 1-hour response target
- Page-level vs section/table failures
- Assigned to you
- Users and orgs affected in the last 24 hours
- Oldest open, median time to acknowledge, resolved today

| Permission | What you can do |
|---|---|
| `it.view_incidents` | See the queue, screenshots, and counts |
| `it.manage_incidents` | Assign, acknowledge, resolve, and delete noise |

Users: [A page or table won't load](/docs/troubleshooting/page-wont-load). Runbooks: [Using the IT Runbooks CMS](/docs/runbooks/using-the-cms).

## Reality check on placeholders

Some IT routes are registered as “coming online” shells awaiting backend integrations. That is intentional product scaffolding so navigation never 404s while data sources are wired. **Active load incidents are live** — they are not a placeholder.

## Incident mindset

- Watch Active Incidents the way you watch error rates
- Assign unassigned page-level failures first
- Open the matching [runbook](/docs/runbooks/using-the-cms) while you work
- After resolve, update the runbook if the steps were wrong

Business compliance data depends on platform reliability. Treat it that way.
