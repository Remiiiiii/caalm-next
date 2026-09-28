---
title: "Volunteers"
description: "Schedule shifts and log volunteer hours on constituent profiles."
section: nonprofit
audience: "Volunteer coordinators, Program staff"
---

Volunteer workflows stay in CAALM so hours sit next to the same constituent record as gifts and consent flags.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Volunteer shifts | `/volunteers/shifts` | Browse and manage shift schedules |
| Constituent profile | `/constituents/[id]` | Log hours, waivers, and exports per person |

## Typical flow

1. Publish or select a shift on **Volunteer shifts**.
2. On the constituent profile, log hours against the shift when the volunteer completes work.
3. Export hour history from the profile when auditors or grant reports ask for proof.

Volunteer hour rows are included in tenant export/delete with other NPO CRM data.

## Permissions

| Key | Meaning |
|---|---|
| `volunteers.view` | See shifts and hour history |
| `volunteers.manage` | Create shifts and log or edit hours |

Related: [Constituents](/docs/reference/constituents).
