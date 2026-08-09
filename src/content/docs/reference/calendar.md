---
title: "Calendar"
description: "Events, shared calendars, invitations, and deadline visibility beside the work."
section: reference
audience: "Everyone"
---

The calendar (`/calendar`) is CAALM’s Outlook-style planning surface for operational time.

## What it is for

- Renewal milestones and compliance events
- Team scheduling related to agreement work
- Shared calendars across groups
- Invite / approve / reschedule / cancel flows (permission-gated)

## Permissions family

Calendar and event permissions are separate on purpose, for example:

- `calendar.view_own` / `view_team` / `view_all`
- `calendar.create`, `edit_own`, `edit_all`, `delete_own`, `delete_all`
- `events.create`, `invite`, `approve`, `reschedule`, `cancel`

## Shared calendars

Shared calendars can be limited to members or made visible more broadly inside the org. Choose visibility deliberately — “public inside org” is still sensitive when dates reveal strategy.

## Outlook integration

Outlook connect/sync lives under Billing → Integrations and requires integration permissions. Demo environments may disable live sync.

## Operating tip

If your team relies on calendar reminders *instead of* accurate record expiration fields, you are recreating the old failure mode CAALM exists to replace. Use both: record date as source of truth, calendar as human planning.
