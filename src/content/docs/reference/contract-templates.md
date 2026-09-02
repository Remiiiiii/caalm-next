---
title: "Contract templates"
description: "Assemble a recipe from published clauses, then create a draft contract in Proposals & Approvals."
section: reference
audience: "Legal, Admins, Contract owners"
---

A contract template is a **recipe**: which published clauses, in what order, for which contract type (for example a vendor MSA). It does not rewrite the Clause Library. Using it **snapshots** today’s active wording into a new draft.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Contract Templates | `/contracts/templates` | Build, publish, and use recipes |
| Proposals & Approvals | `/contracts/approvals` | The draft lands here after you use a template |

## How it fits with the Clause Library

1. Legal publishes clauses in the [Clause Library](/docs/reference/clause-library)
2. Someone with template access builds a recipe from those **active** clauses
3. A teammate with `contracts.create` clicks **Use template**, names the contract, and creates a draft
4. The team reviews, approves, and signs that draft like any other contract

Later library edits do not silently change drafts that already exist. The next **Use template** run uses the newest published versions.

## Statuses

| Status | Meaning |
|---|---|
| Draft | Recipe still being assembled. Do not use it for real deals. |
| Active | Available on **Use template**. |
| Archived | Hidden from the active catalog. |

## Core workflow

1. Open **Contract Templates**
2. Create a template: title, contract type, description
3. Add at least one **active** clause and set the order
4. Publish the template to **active**
5. When a deal starts, **Use template** → name the contract → **Create draft**
6. Finish metadata, evidence, and [approvals](/docs/reference/approvals) on that draft

> [!WARNING]
> You cannot assemble a template from draft-only clauses. Publish the wording first, then attach it to the recipe.

## Permissions

- `contract_templates.view`: see the catalog
- `contract_templates.create`: add a recipe
- `contract_templates.edit`: change title, type, clause order, or status
- `contract_templates.delete`: archive a template (sensitive)
- `contracts.create`: required to **Use template** and spawn a draft

Related: [Clause Library](/docs/reference/clause-library), [Contracts](/docs/reference/contracts), [Approvals](/docs/reference/approvals).
