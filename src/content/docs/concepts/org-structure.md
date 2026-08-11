---
title: "Organizations, departments, and divisions"
description: "How CAALM scopes work across organizations and internal structure."
section: concepts
audience: "Admins, Managers"
---

CAALM is multi-tenant at the **organization** level. Inside an org, work is further scoped by departments/divisions so managers are not drowning in everyone else’s agreements.

## Organization

The hard boundary. Users, roles, billing, and records belong to an organization. You should never see another org’s contracts.

## CAALM product language

| CAALM field | Meaning | Examples |
|---|---|---|
| **Department** | Parent grouping | IT, Finance, Operations, Executive |
| **Division** | Program / leaf under a department | behavioral-health, hr, help-desk, c-suite |

**Division is how department managers get a meaningful home.** Parent/child pairs must stay consistent (for example `hr` → Administration).

Default bootstrap pairs ship with the product; each org can manage its own org-unit tree under **Settings → Organization → Org structure**.

Step-by-step for that screen: [Organization settings](/docs/reference/organization-settings).

## Cost centers

Cost centers are **budget labels**, separate from the people tree.

- Department / division = where someone sits
- Cost center = which money bucket spend (or a person) is charged to

Example: an IT Help Desk person whose contracts still hit a clinic grant budget. Manage the shared list on the Org structure tab; tag contracts when finance cares. Skip the list if you never track spend by budget code.

## SCIM / IdP naming map

**SCIM** is an optional sync language big companies use so HR systems can push employee details into apps. Most small orgs never touch it.

Enterprise directories (Okta, Azure AD, Workday via SCIM) usually put **division above department**. CAALM is inverted for nonprofit program language. When syncing:

| SCIM enterprise attribute | CAALM user field |
|---|---|
| `organization` | Organization name / `orgId` |
| `division` | `user.department` (parent) |
| `department` | `user.division` (program leaf) |
| `costCenter` | Linked cost center code |
| `manager.value` | `managerUserId` |

Do not map SCIM `department` onto CAALM `department` by name alone.

## What breaks when division is wrong

- Department Manager dashboards look empty or oddly global
- Analytics division pages disagree with “my contracts”
- Invites onboard people into the wrong operating context

## Admin checklist

1. Seed or define the org-unit tree your org actually uses ([Organization settings](/docs/reference/organization-settings)).
2. Set division (and matching department) on invite — do not “fix it later” for managers.
3. Re-check placement when someone changes teams.
4. Add cost centers only if finance needs shared budget codes.
5. Prefer permission changes over silent cross-division visibility hacks.

## Practical analogy

Organization = company building. Department = wing. Division = floor. Permissions = which keys open which rooms on your floor.
