---
title: "Executive / Super Admin guide"
description: "Platform operators and break-glass access — who Super Admin is for, and how to keep it rare."
section: guides
audience: "Super Admin"
---

**Super Admin** runs CAALM itself: rare emergency tools, platform diagnostics, and full access when something is broken. It is not “whoever is in charge of the organization.”

Simple rule: Super Admin = **system operator**. Organization Admin = **company operator**.

## Responsibility scope

You get everything an Organization Admin can do, **plus** platform-only powers:

| Platform power | What it means in plain English |
|---|---|
| RBAC diagnostics / cache clearing | Fix access glitches when permissions look wrong |
| Database schema tools | Change underlying data structure (dangerous) |
| Force-delete files | Remove stuck files when normal delete fails |
| Cross-org visibility | See across organizations when the product supports it |
| System-wide settings | Platform settings (including policies like required 2FA) |
| Privileged elevation | Eligible for time-boxed break-glass access when enabled |

Keep this membership **tiny** — usually 1–2 people.

## Who should be Super Admin

| Context | Typical Super Admins |
|---|---|
| Most organizations | CAALM implementation partner / IT vendor; internal IT if you have one |
| Non-profits | Same: vendor or internal systems admin — **not** automatically the Executive Director |
| Backup | At most one trusted tech-savvy leader |

Title in the org (ED, CEO, Board Chair) does **not** mean Super Admin. Give leaders [Organization Admin](/docs/guides/organization-admin) unless they truly need platform break-glass tools.

## Non-profit example

| Person | Role |
|---|---|
| Executive Director | Organization Admin (not Super Admin by default) |
| Ops / Office Manager | Organization Admin |
| Finance / compliance lead | Organization Admin or a narrower custom role |
| Program managers | Department Manager (or custom) |
| Staff / volunteers | Viewer or job-specific roles |
| IT vendor / CAALM partner | **Super Admin** |
| Internal IT (if any) | **Super Admin** |

Aim for **1–2 Super Admins** total. Prefer vendor + one backup.

## Your home base

`/dashboard/superadmin` surfaces org-wide expiries, charts, users, news, and invitation health — useful for oversight, not for doing every department’s uploads.

## Weekly operating rhythm

1. **Scan risk** — what expires in 30/60/90 days?
2. **Check ownership gaps** — critical records with weak or missing owners
3. **Review approval latency** — queues that stall create silent risk
4. **Audit access** — unexpected Super Admin grants, dormant users, oversized roles
5. **Read the narrative** — company news + analytics for board/funders conversations

## What you should personally do

- Approve only what policy says *you* must approve
- Assign ownership downward with clear dates
- Keep Super Admin membership tiny
- Use analytics for questions, not vibes
- Prefer granting Organization Admin (or a smaller role) over elevating someone to Super Admin

## What you should refuse to do

- Be the perpetual uploader for every department
- Grant Super Admin because someone is blocked once
- Bypass permissions “just this quarter”
- Hand Super Admin to an executive “just in case” when Organization Admin covers their job

## Power features to know

- User Management + Role Management
- Billing & Integrations (with billing permission)
- System settings (platform / Super Admin territory)
- Org-wide contracts/licenses and audit views
- SAM.gov advanced resources when pursuing opportunities
- RBAC diagnose tools when access looks stuck

## Escalation questions that matter

- Which revenue/funding streams are tied to expiring agreements this quarter?
- Which divisions have the worst owner hygiene?
- Are notifications reaching the people who can act?
- Who still has Super Admin, and do they still need it?

Companion refs: [Organization Admin guide](/docs/guides/organization-admin), [Permissions](/docs/concepts/permissions), [Dashboards](/docs/reference/dashboards), [Stand up a new organization](/docs/admin/standup).
