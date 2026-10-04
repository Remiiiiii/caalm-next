---
title: "Gifts and campaigns"
description: "Post gifts, void with reason, tie to campaigns and funds, and read the development dashboard."
section: nonprofit
audience: "Development staff, Finance partners"
---

Gifts are cash and in-kind donations tied to constituents. Campaigns group appeals; the development dashboard summarizes year-to-date posted giving for leadership. Card gifts from the [public donation page](/docs/reference/donation-page) post here automatically after Stripe confirms payment.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Gift register | `/gifts` | Search posted and voided gifts |
| New gift | `/gifts/new` | Record a gift with fund/designation when required |
| Gift detail | `/gifts/[id]` | Receipt status, soft credits, share attribution, audit trail |
| Campaigns | `/campaigns` | Campaign list and detail with response totals |
| Development dashboard | `/dashboard/development` | YTD posted gifts (voids excluded) |
| Public donation page | `/give/{slug}` | Online ask; configure under Donation page settings |

## Post a gift

1. Open **New gift** (or post from a constituent timeline when available).
2. Select constituent, amount, date, and **fund** / designation when your org requires them.
3. Post when values are correct. Voiding requires a reason and permission — do not delete posted history.

## Campaigns

Create campaigns for appeals and events. Posted gifts with a campaign id roll into response metrics on the campaign detail page.

## Development dashboard

Use `/dashboard/development` for board-ready YTD totals. Counts use **posted** gifts only; voids are excluded.

## Permissions

| Key | Meaning |
|---|---|
| `gifts.view` | Browse gifts, campaigns, and the development dashboard |
| `gifts.create` | Post new gifts |
| `gifts.void` | Void a posted gift with reason |

Related: [Public donation page](/docs/reference/donation-page), [Constituents](/docs/reference/constituents), [Nonprofit finance settings](/docs/reference/nonprofit-finance-settings).
