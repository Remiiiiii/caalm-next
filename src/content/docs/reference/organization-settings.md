---
title: "Organization settings"
description: "Profile, plan limits, and org structure at /settings/organization — what each tab does and how to use it."
section: reference
audience: "Organization Admin, Super Admin"
---

Organization settings is where you shape **your company’s home in CAALM**: who you are as an org, how large you can grow under the plan, and how teams are named.

Route: **`/settings/organization`**

You need `settings.view` to open it and `settings.edit` to change most fields. If you only see your personal [Settings and profile](/docs/reference/settings) page, you are correctly scoped — ask an Organization Admin.

For the mental model behind departments and divisions, read [Organizations, departments, and divisions](/docs/concepts/org-structure).

## What’s on the page

Three tabs:

| Tab | Job |
|---|---|
| **Profile** | Org name, email domain, timezone, and public website URL |
| **Limits** | Max users and max departments for this org |
| **Org structure** | Live catalog of departments, divisions, and cost centers |

Subscription tier and status show at the top (read-only from billing).

## Profile

Use this when the company name, primary email domain, audit schedule timezone, or public website changes.

1. Open `/settings/organization`
2. Edit **Organization name** and optional **Email domain**
3. Set **Timezone (audit schedule)** to an IANA value such as `America/New_York`  
   Audit readiness weekly/monthly/quarterly jobs use the org’s **local 9:00** hour.
4. Optionally set **Public website URL** for informational site crawl on readiness packets
5. Save profile

Domain is a label for your org (for example `acme.org`). It does not replace invite email checks by itself.

Website URL is separate from email domain. It is used by [Audit readiness](/docs/reference/audit-readiness) for a bounded public-site crawl and is **not** part of the readiness score.

## Limits

Limits cap how many people and parent departments this org may hold under the current plan.

- **Max users** — invite ceiling
- **Max departments** — how many active parent departments you may keep in Org structure

Raise limits only when the plan and real headcount need it. The Org structure tab will refuse a new department when you are already at the max.

## Org structure

This tab is the shared menu of team names used when you invite people, edit users, and keep manager views honest.

### Departments and divisions

| Term | Plain meaning | Example |
|---|---|---|
| **Department** | Parent group / wing of the org | IT, Finance, Executive |
| **Division** | Program or team under that department | Help Desk under IT, C-Suite under Executive |

Analogy: organization = building, department = wing, division = floor.

**Why it matters:** Department Managers and many filters key off department and division. Wrong placement means empty dashboards or the wrong contracts.

#### First-time setup

1. Open **Org structure**
2. If the list is empty, choose **Seed defaults** (safe to run again — it fills missing catalog rows)
3. Add or rename departments to match how *your* org talks about teams
4. Add divisions under the right department
5. On invite (and when someone moves teams), pick department + division from this catalog — see [Invite and onboard](/docs/admin/invite-onboard)

#### Day-to-day edits

- **Add department** — new parent group (blocked if at max departments)
- **Add division** — pick the parent department first, then name the program
- **Archive** — hides the unit from pickers so new people are not assigned there
- **Restore** — brings an archived unit back

Archive does **not** strip existing users’ current department/division labels. Fix those people when they change teams.

You cannot archive a unit that still has people using it as their primary org home — move them first.

### Cost centers

Cost centers answer **“whose budget?”**, not **“whose team?”**.

Someone can sit in IT / Help Desk and still charge spend to a clinic or grant budget. Finance teams use these codes so contracts and people land on the same budget labels instead of free-typed spellings.

| Use cost centers when… | Skip them when… |
|---|---|
| Finance tracks spend by budget code | You never tag agreements by budget |
| You want one shared list of real codes | Admins are happy with ad-hoc notes |

#### How to use them

1. Ask finance for the codes they already use (for example `CC-400` / Clinic Operations)
2. On **Org structure → Cost centers**, add **code** + **name**
3. When uploading or editing a **contract**, put that budget on the cost center field so the agreement is tagged for finance
4. Archive old codes when budgets retire; restore if you bring one back

Cost centers do **not** control who can see contracts. Access still comes from [permissions](/docs/concepts/permissions) and department/division placement.

> [!NOTE]
> Enterprise directories (Okta, Azure AD, and similar) sometimes sync a cost center onto the employee record. CAALM stores that as an optional link for HR sync. Most small orgs only need the catalog for contract tagging. Details: [org structure concepts](/docs/concepts/org-structure).

## Who should touch this page

| Role | Typical use |
|---|---|
| Organization Admin | Profile, limits (when plan allows), org structure, invites aligned to the catalog |
| Super Admin | Same, plus rare platform work outside this page |
| Department Manager / Viewer | Usually no edit access here — they *consume* the names on records and dashboards |

## Common mistakes

- Inviting managers before Org structure matches real teams
- Treating cost centers like departments
- Archiving a department while people still report into it without updating those users
- Raising max departments without cleaning inactive ones first

## Related pages

- [Organizations, departments, and divisions](/docs/concepts/org-structure)
- [Invite and onboard users](/docs/admin/invite-onboard)
- [Stand up a new organization](/docs/admin/standup)
- [Organization Admin guide](/docs/guides/organization-admin)
- [Settings and profile](/docs/reference/settings)
