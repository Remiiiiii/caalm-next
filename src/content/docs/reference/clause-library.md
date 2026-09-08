---
title: "Clause Library"
description: "Store, version, and publish the standard contract wording your organization reuses."
section: reference
audience: "Legal, Admins, Contract owners"
---

The Clause Library is the pantry of approved paragraphs. One clause is one block of wording (termination, payment, indemnity) that the whole org can reuse instead of copying from last year’s Word file.

A **family** is that clause over time (v1, v2, v3). Templates point at the family, not a one-off paste.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Clause Library | `/contracts/library` | Search, filter, and edit standard wording |

## Clause vs template

- **Clause**: one approved paragraph, categorized and versioned
- **Template**: a recipe that picks clauses, in order, for a contract type

If you change a clause here, existing drafts created from a template **keep the old snapshot**. New uses of a template pick up the current published version.

## Statuses

| Status | Meaning |
|---|---|
| Draft | Work in progress. Editing overwrites this draft. Templates only use **active** clauses. |
| Active | Published. Safe to put on a template. Editing creates a **new version** so history stays intact. |
| Archived | Off the active library. Older versions remain for history. |

## Core workflow

1. Open **Clause Library**
2. Create a clause with a clear title, category, and body
3. Keep it as **draft** until legal (or your policy owner) is ready
4. Publish to **active**
5. When wording must change, edit the active clause and add a short change note. CAALM stores a new version.
6. Archive when the org should stop using that family on new templates

> [!TIP]
> Name clauses by job, not by deal (“Vendor payment terms”, not “Acme 2024 PDF dump”). Search and templates both depend on that.

## Categories you will see

Confidentiality, payment, termination, liability, indemnification, intellectual property, data protection, governing law, and other.

## Permissions

- `clauses.view`: browse the library
- `clauses.create`: add a new family
- `clauses.edit`: update drafts or publish a new version
- `clauses.delete`: archive the current clause (sensitive)

Related: [Contract templates](/docs/reference/contract-templates), [Contracts](/docs/reference/contracts), [Approvals](/docs/reference/approvals).
