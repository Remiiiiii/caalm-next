---
title: "Constituents (donor CRM)"
description: "Browse donors, volunteers, and members; import rows; run stewardship; manage channel consent."
section: nonprofit
audience: "Development staff, Admins, Compliance"
---

Constituents are your org’s people file — donors, volunteers, members, and prospects — separate from contract records so gift staff are not forced into contract admin permissions.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| All Constituents | `/constituents` | Search, open profiles, edit with manage permission |
| Import | `/constituents/import` | Upload CSV, map columns, commit rows |
| Stewardship queue | `/constituents/stewardship` | Follow up on segments and receipt follow-through |
| Profile (Intelligence tab) | `/constituents/[id]` | Lapse/upgrade scores, suggested ask, wealth screen import |

## Core workflows

### Find and update someone

1. Open **All Constituents** and search by name or email.
2. Open the profile. Edit demographics, tags, and **channel consent** (email, SMS, mail, phone) when you have manage permission.
3. Changes to consent are audit-logged. Do-not-contact still blocks all channels.

### Import a batch

1. Open **Import**, upload a CSV, and map columns to constituent fields.
2. Preview duplicates and fix errors before commit.
3. Commit only when the preview looks right — imports are harder to undo than single edits.

### Stewardship

The queue surfaces people who need a touch based on segments and giving activity. Use it for receipt follow-up and renewal-style outreach, not as a mass email blaster.

## Fundraising intelligence (scores)

On a constituent profile, the **Intelligence** tab shows segment label, lapse risk, upgrade readiness, and suggested ask when the nightly job has run. Staff can override the ask with a short reason.

Scores are derived from giving history (personal data). They are stored with segment rows and are included in tenant export/delete with other CRM tables. CAALM does not operate a separate “wealth engine” — you may **import a wealth screen** from external research.

Permission: `ai.fundraising` to view scores; constituent edits still use `constituents.manage`.

## Permissions

| Key | Meaning |
|---|---|
| `constituents.view` | Browse constituents, stewardship, and development dashboard |
| `constituents.manage` | Create, edit, merge, import, and delete people |
| `ai.fundraising` | View donor scores and next-best-action on the Intelligence tab |

Related: [Gifts and campaigns](/docs/reference/gifts-and-campaigns), [Permissions catalog](/docs/reference/permissions-catalog#constituents).
