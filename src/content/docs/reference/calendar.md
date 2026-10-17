---
title: "Calendar"
description: "Events, shared calendars, invitations, pinned Quick Notes, and deadline visibility beside the work."
section: reference
audience: "Everyone"
---

The calendar (`/calendar`) is CAALM’s Outlook-style planning surface for operational time.

## What it is for

- Renewal milestones and compliance events
- Team scheduling related to agreement work
- Shared calendars across groups
- Invite / approve / reschedule / cancel flows (permission-gated)
- Optional **pinned Quick Notes** on the month view (personal reminders, not meeting events)

## Permissions family

Calendar and event permissions are separate on purpose, for example:

- `calendar.view_own` / `view_team` / `view_all`
- `calendar.create`, `edit_own`, `edit_all`, `delete_own`, `delete_all`
- `events.create`, `invite`, `approve`, `reschedule`, `cancel`

## Shared calendars

Shared calendars can be limited to members or made visible more broadly inside the org. Choose visibility deliberately — “public inside org” is still sensitive when dates reveal strategy.

## Outlook / Microsoft 365 calendar

Outlook calendar connect/sync lives under Billing → Integrations on the **Microsoft 365** card (**Calendar** tab) and requires `integrations.outlook.connect`. Demo environments may disable live sync.

In-app **Mail** (inbox panel from the header envelope) is a separate connect on the same card’s **Mail** tab. See [Mail (Gmail and Outlook)](/docs/reference/mail).

## Pinned Quick Notes on the month view

From the dashboard Quick Notes widget you can **Pin to calendar** with a date and time. Those notes show as note icons on the calendar month for that day.

1. Click a day’s note icon to open **Notes for** that day
2. Open a row to read the full note, edit it, or delete it
3. Use **All notes** to return to the day’s list

Pinned notes are not calendar events — they do not invite attendees or sync as Outlook meetings. Create them and manage pin fields from [Quick Notes](/docs/reference/quick-notes).

## Operating tip

If your team relies on calendar reminders *instead of* accurate record expiration fields, you are recreating the old failure mode CAALM exists to replace. Use both: record date as source of truth, calendar as human planning.
