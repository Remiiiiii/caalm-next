---
title: "What are runbooks?"
description: "Action guides for production problems — kept in the IT portal, explained here."
section: runbooks
audience: "IT, Admins, On-call"
---

A **runbook** is a documented set of steps for a specific operational situation.

Plain definition: when something breaks (or needs a routine ops task), the runbook answers “what do we do now?” — not “who to blame.”

## Docs vs IT runbooks

| | `/docs` (this site) | IT Runbooks CMS |
|---|---|---|
| Purpose | Teach the product and the idea of runbooks | Store live recovery procedures |
| Audience | Every CAALM role | IT / on-call / ops |
| Trigger | Onboarding, learning | Incidents and alerts |
| Sensitivity | Broadly shareable | Often internal and environment-specific |

> [!IMPORTANT]
> The system of record for operational runbooks is the **IT portal** at `/dashboard/it/incidents/runbooks`. These docs pages explain the feature; they are not where you keep “restart payment webhooks” steps.

## Why CAALM has both

- Product docs help every user understand compliance workflows.
- IT runbooks help platform operators restore service when CAALM (or its dependencies) misbehaves.

If you would open it during an outage, it belongs in IT. If you would open it during onboarding, it belongs here.

Next: [Using the IT Runbooks CMS](/docs/runbooks/using-the-cms).
