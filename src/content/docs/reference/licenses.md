---
title: "Licenses"
description: "Track credentials and renewals that keep your organization legal to operate."
section: reference
audience: "Managers, Admins, Compliance"
---

Licenses are easy to underestimate until one lapses.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| All Licenses | `/licenses` | Org-visible license library |
| Department Licenses | `/licenses/department` | Division/department working set |
| Approvals | `/licenses/approvals` | Review / renew / approve flows |

## How licenses differ from contracts (in practice)

- Often tied to **permission to operate** (facility, clinical, professional)
- Renewal windows can be unforgiving
- Evidence packets may include certificates, inspection letters, or training artifacts in Files

## Lifecycle

Capture → assign owner → track expiry → renew with evidence → keep status honest.

Permissions commonly involved: `licenses.view`, `create`, `edit`, `delete`, `allocate`, `renew`.

## Manager tip

If your department page is empty but you know licenses exist, check:

1. Your division assignment
2. Whether licenses were filed under another division
3. Filters hiding inactive/expired items
4. Missing `licenses.view`

## Executive tip

License risk should appear in leadership dashboards early enough to fund renewal work — not as a surprise the week of expiration.
