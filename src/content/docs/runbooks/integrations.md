---
title: "Runbook integrations"
description: "How PagerDuty, Opsgenie, and monitoring hooks attach to runbooks."
section: runbooks
audience: "IT, Admins, On-call"
---

Integrations connect **alerts** to **the right runbook** so humans waste less time searching.

## Supported adapter slots in CAALM

CAALM ships integration adapters for:

- PagerDuty
- Opsgenie
- Generic monitoring webhooks (Datadog / CloudWatch style payloads)

Each adapter can:

1. Receive an alert payload
2. Map service / severity tags to candidate runbooks
3. Return deep links into `/dashboard/it/incidents/runbooks/[id]`

## What is live vs stubbed

Until Active Incidents backends are fully wired, adapters return structured **stub responses** and configuration status. The CMS, permissions, and deep links are real; external provider auth is opt-in via env.

## Configuration (when ready)

| Env / setting | Purpose |
|---|---|
| PagerDuty routing keys / API | Map PD services → CAALM services |
| Opsgenie API | Map teams/alerts → runbooks |
| Monitoring webhook secret | Authenticate inbound alerts |

See admin setup for collection + permission prerequisites: [Admin setup](/docs/runbooks/admin-setup).
