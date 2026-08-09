---
title: "Using the IT Runbooks CMS"
description: "Find, open, create, and update live runbooks in the IT portal."
section: runbooks
audience: "IT, Admins, On-call"
---

## Where to go

Open **IT → Incident Management → Runbooks** (`/dashboard/it/incidents/runbooks`).

You need `it.view_runbooks` to browse and `it.manage_runbooks` to create or edit.

## Browse and open

1. Use search for a service name, symptom, or title (“auth”, “Appwrite”, “backup”).
2. Filter by severity or status (draft / published / archived).
3. Open a runbook to see symptoms, steps, verification, and escalation.

## Create or update (managers)

1. Click **New runbook**.
2. Fill title, service, severity, symptoms, steps, verification, escalation.
3. Save as **draft** until reviewed.
4. Publish when an unfamiliar on-call engineer could follow it.

## During an incident

1. Start from **Active Incidents** (or an alert deep link when integrations are live).
2. Open the matching runbook from the suggested list or search.
3. Execute steps in order.
4. Record what worked; update the runbook after the incident.

## Related product screens

- Active Incidents
- On-Call Schedule
- Post-Mortems
- Incident Response

Writing standards: [Writing a good runbook](/docs/runbooks/writing).
