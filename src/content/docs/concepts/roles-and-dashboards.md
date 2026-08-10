---
title: "Roles and home dashboards"
description: "What each role sees first, how multi-role priority works, and why dashboards differ."
section: concepts
audience: "Everyone, Admins"
---

Your **home dashboard** is CAALM’s answer to “what should I look at first today?”

## Role → home path

| Role | Home | What it emphasizes |
|---|---|---|
| Super Admin | `/dashboard/superadmin` | Platform oversight + org-wide risk (keep membership tiny) |
| IT | `/dashboard/it` | Platform operations (separate IT sidebar) |
| Organization Admin | `/dashboard/organizationadmin` | Company ops: invites, users, settings, operational widgets |
| Content Creator | `/dashboard/content-creator` | News stats, articles, publishing |
| Department Manager | `/dashboard/departmentmanager` | Division-scoped action queue + compliance |
| Viewer | `/dashboard/viewer` | Read-oriented executive-style visibility |

## Multi-role priority

If you hold more than one role, CAALM still needs one default home. Priority is roughly:

**Super Admin → IT → Organization Admin → Content Creator → Department Manager → Viewer**

You may still open other dashboards from navigation when permitted.

## Why department managers see less

Department Manager navigation intentionally hides some org-wide surfaces (for example all-contracts / advanced SAM resources / some org settings) so the UI matches their scope. This is not a bug — it is scope design. If a manager needs broader access, an admin should grant permissions / roles deliberately.

## IT is a different door

IT users get a dedicated portal and sidebar (`IT_NAVIGATION`). Monitoring, CI/CD, incidents, and security live there — not in the main compliance sidebar.

## Practical advice

- New users: trust the home dashboard for week one.
- Admins: do not hand out Super Admin to skip permission design — use Organization Admin for company ops.
- Non-profits: ED / Ops / Finance → Organization Admin; IT vendor → Super Admin.
- Managers: if your division is blank, your user profile may be missing `division` — fix identity data before blaming widgets.

Deep dives: [Guides by role](/docs/guides/super-admin).
