---
title: "Nonprofit finance settings"
description: "Restricted funds, Form 990 Part IX worksheet mapping — not payroll, GL, or 990 e-file."
section: nonprofit
audience: "Finance, Admins, Compliance"
---

These settings support fund accounting and preparer handoff. They complement [Funding and retention](/docs/reference/funding-retention) (grant **contracts**), not replace your ledger or payroll system.

> [!IMPORTANT]
> CAALM tracks restricted funds, grant budgets, and a **Form 990 Part IX functional expense worksheet** for your preparer. It is **not** payroll, **not** a general ledger, and does **not** offer **990 e-file**.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Funds | `/settings/funds` | Fund codes used on gifts and obligations |
| Form 990 mapping | `/settings/form-990` | Map categories to Part IX worksheet buckets |

## Funds

Define fund codes your gift and obligation flows must respect. When a gift requires a fund, posting without one should fail validation — fix the fund list before blaming users.

## Form 990 worksheet mapping

Map obligation and gift categories to program, management, and fundraising buckets. Export produces a **worksheet CSV** for your accountant. CAALM does not file with the IRS.

## What CAALM does not ship

- Payroll processing
- General ledger posting or live Intacct / QuickBooks two-way sync (journal export is a download for your existing ledger)
- 990 e-file

Related: [Funding and retention](/docs/reference/funding-retention), [Gifts and campaigns](/docs/reference/gifts-and-campaigns).
