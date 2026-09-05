---
title: "Funding and retention"
description: "Rank live contracts by money at stake, track obligations, and move new bids from SAM.gov or a manual lead into Proposals & Approvals."
section: reference
audience: "Managers, Finance, Capture, Admins"
---

Funding & Retention turns “this contract expires” into “this dollar stream is protected,” and “this bid is being won.”

Two jobs live on one page:

- **Retention**: money already on the books. CAALM ranks live contracts by amount and health, then lets you attach the work that keeps that money (renewal, reporting, deliverable).
- **Pursuits**: money you are trying to win. Track a bid from watching through submitted, then mark a win and spawn a proposal.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Funding & Retention | `/contracts/funding-retention` | Retention board, obligations, pursuits pipeline |
| Proposals & Approvals | `/contracts/approvals` | Drafts created from a won pursuit |
| SAM.gov | `/contracts/advanced-resources` | Optional source for new pursuits |

## Retention

The board reads your contracts. Health is a triage label, not a legal status:

| Health | Meaning |
|---|---|
| At risk | Needs action soon: expirations, overdue work, or both |
| Protecting | Work is underway to keep the stream |
| Protected | In good standing |
| Expired | The agreement window has closed |

Headline stats (**At risk**, **Protecting**, **Protected**) sum those streams in dollars.

### Obligations

Select a stream, then record the work that keeps the money: renewal, reporting, deliverable, compliance, payment, or other. Statuses include open, in progress, done, waived, and overdue.

Treat obligations as the to-do list **on** the funded contract, not a second copy of the contract record.

## Pursuits

Stages: watching → qualifying → pursuing → submitted → won / lost / abandoned.

Sources:

- **Manual**: a lead your team already knows
- **SAM.gov**: a federal notice you are tracking (link back to the opportunity when you have one)

When a pursuit is **won**, spawn a proposal so capture work becomes a contract draft instead of staying in a spreadsheet.

> [!TIP]
> Retention is for dollars you already have. Pursuits are for dollars you do not have yet. Do not park a live grant only on the pursuits board.

## Core workflow

### Protect existing funding

1. Open **Funding & Retention** (Retention tab)
2. Sort by the streams with the largest **at risk** dollars
3. Open the contract, confirm owner and expiration
4. Add or update obligations until the next action is obvious
5. Refresh after you complete work so health and totals move

### Win new funding

1. Switch to **Pursuits**
2. Create a pursuit (manual or from SAM.gov)
3. Move the stage as the bid advances
4. On **won**, create the proposal and finish it under [Approvals](/docs/reference/approvals)

## Permissions

Funding is scoped separately from full contract edit/approve, so finance or capture roles can work this board without becoming contract admins.

- `funding.view`: see streams, obligations, and the pursuit pipeline
- `funding.manage`: create/edit pursuits and obligations, mark wins, spawn proposals from won bids

Related: [Contracts](/docs/reference/contracts), [SAM.gov](/docs/reference/sam-gov), [Approvals](/docs/reference/approvals), [Notifications and deadlines](/docs/concepts/notifications-deadlines).
