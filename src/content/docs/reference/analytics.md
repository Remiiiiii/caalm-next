---
title: "Analytics and reports"
description: "Overview, quick view, C-suite, division analytics, and Risk averted for leadership questions."
section: reference
audience: "Executives, Managers"
---

Analytics translate operational records into leadership answers.

## Surfaces

- `/analytics` — overview
- `/analytics/quick-view` — faster scan
- `/analytics/c-suite` — executive framing
- `/analytics/risk-averted` — dollars and events you kept from walking out the door
- Division pages (behavioral health, child welfare, clinic, CFS, residential, departments, etc.)

Department managers may be redirected toward their division analytics.

## Risk averted

**Risk averted** (`/analytics/risk-averted`) is the board-facing story of work that already happened: flags caught, audit gaps closed, licenses renewed on time, and the dollars CAALM counts toward that total.

You need `contracts.view` to open it.

| Control | What it does |
|---|---|
| Period | Year to date, this month, this quarter, last 30 days, last 90 days |
| Kind filter | All events, or flags / gaps / renewals |
| Search | Record name or source |
| Download PDF | Board packet with narrative, counted events, and still-open exposure |
| Export Excel | The event register for the current period |

Only events marked **counted toward total** add to the headline dollar figure. Duplicates stay in the register so you can see the work without double-counting money.

Still-open exposure (high risk, expiring in 90 days, already expired) is current state. It does not shrink when you change the period toggle.

Treat this page as a **packet**, not a certificate. Wrong dates and missing owners make the number look confident and still be wrong.

## Questions analytics should answer

- Where is renewal risk concentrating?
- Which division is operationally healthy?
- Are approvals keeping pace?
- Is the org’s workload matched to staffing reality?
- What risk did we already catch this quarter, and what is still open?

## Distrust charts fed by bad inputs

If dates/owners are wrong, analytics become confident nonsense. Fix records first.

## Permission / access notes

Analytics navigation is permission-sensitive. If C-Suite is locked, that is elevated access by design.
