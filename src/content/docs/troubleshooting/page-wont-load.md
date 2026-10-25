---
title: "A page or table won't load"
description: "What the couldn't-load screen means, how to retry, and how IT gets the incident automatically."
section: troubleshooting
audience: "Everyone, IT"
---

When CAALM cannot load a page, table, or section, you see a **couldn't load** message instead of a blank screen.

Your records are not deleted. The fetch failed. Retry first.

## What you should do

1. Click **Retry**
2. If you are offline, reconnect, then retry
3. Copy the **reference** if one is shown (looks like `INC-7F3A92`)
4. If it still fails, send that reference to IT — do not open a second Engineering ticket unless they ask

CAALM already reports the failure to **IT → Active Incidents**. Same page + same error folds into one incident, so five teammates hitting the same bug do not create five tickets.

## What the variants mean

| You see | Meaning |
|---|---|
| Couldn't load + Retry + reference | A real error. IT gets an incident (screenshot of the failed region; sensitive bits are masked) |
| You're offline | Browser has no network. CAALM does not file an incident |
| You don't have access | Missing permission. Ask an admin — this is not a crash |
| Couldn't refresh (banner) | Stale numbers are still on screen. Retry when you can |

## What IT does with it

People with `it.view_incidents` open `/dashboard/it/incidents/active`. People with `it.manage_incidents` assign, acknowledge, and resolve.

If the same failure comes back after resolve, CAALM opens a **new** incident and links it as a reopen — it does not silently revive the old one.

Related: [IT portal](/docs/reference/it-portal), [Help vs Engineering tickets](/docs/troubleshooting/help-vs-engineering-tickets), [IT staff guide](/docs/guides/it-staff).
