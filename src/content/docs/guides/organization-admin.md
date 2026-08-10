---
title: "Organization Admin guide"
description: "Run the company inside CAALM — invites, roles, settings, and day-to-day ops without platform break-glass tools."
section: guides
audience: "Organization Admin"
---

**Organization Admin** runs the **organization’s work in CAALM** day to day: people, roles, settings, contracts, licenses, and approvals. Executives and ops leads usually sit here — not on Super Admin.

Simple rule: Organization Admin = **company operator**. Super Admin = **system operator**.

## Responsibility scope

You own day-to-day company operations inside CAALM:

- **Users** — invite, edit, deactivate, assign roles
- **Org settings**, billing, and integrations (when you hold those permissions)
- **Contracts, licenses, calendar, news, audits, AI** features your role pack includes
- **Approvals** for org workflows (including override only if that permission is granted)
- **Custom roles** — build job-shaped roles with templates; avoid mega-roles

You do **not** get platform break-glass tools (diagnostics wipe-all, schema tools, force-delete, system-wide platform settings). Those stay with [Super Admin](/docs/guides/super-admin).

## Who should be Organization Admin

| Context | Typical Organization Admins |
|---|---|
| Most organizations | Ops lead, office manager, finance/compliance admin; sometimes the ED/CEO |
| Non-profits | Executive Director, Ops / Office Manager, Finance or compliance lead |
| Count | About **2–4** people for a mid-size org — not everyone with a leadership title |

Program managers and staff usually need Department Manager, Viewer, or a custom role — not Organization Admin.

## Non-profit example

| Person | Role |
|---|---|
| Executive Director | **Organization Admin** |
| Ops / Office Manager | **Organization Admin** |
| Finance lead | **Organization Admin** (or a narrower custom role) |
| Program managers | Department Manager (or custom) |
| Staff / volunteers | Viewer or job-specific roles |
| IT vendor / CAALM partner | Super Admin |
| Internal IT (if any) | Super Admin |

If the ED wants Super Admin “just in case,” start with Organization Admin. Add Super Admin only if they truly need platform tools — and remove it when implementation is stable.

## Home base

`/dashboard/organizationadmin` — invitations, users, performance widgets, news, expiry, calendar-oriented ops.

## Core jobs

### 1. Invite correctly the first time
- Role + division + department context on invite
- Confirm the user lands on the expected dashboard
- Follow up if they stall on 2FA

### 2. Keep identity data clean
- Name, email, division, role assignments
- Deactivate users who left — do not just “take them out of the email list”

### 3. Maintain settings surfaces
- Organization settings
- Billing & Integrations when you hold `settings.billing` / `settings.integrations`
- Leave **System settings** to Super Admin unless you are explicitly granted platform system access

### 4. Unblock without over-granting
When someone hits a lock:
1. Open their access reality (roles/permissions) — **View My Access** / User Management
2. Identify the missing permission or wrong role
3. Grant the minimum role/permission change (prefer a template-based custom role)
4. Document why

### 5. Design small roles
Use Role Management templates (Viewer, Contract reviewer, Department manager, Content creator, IT) instead of copying a power user’s accidental access.

## Anti-patterns

- Creating a shadow Super Admin culture
- Leaving invites pending for weeks
- Connecting Outlook before calendar training
- Treating billing changes casually
- Elevating someone to Super Admin because one button was locked

## Daily / weekly checklist

- [ ] Pending invites cleared or nudged
- [ ] New users completed 2FA
- [ ] No unexplained role changes
- [ ] Expiry widgets reviewed with owners
- [ ] Integration health glanced at
- [ ] Super Admin list still tiny (escalate odd grants to platform ops)

See: [Super Admin guide](/docs/guides/super-admin), [Invite and onboard users](/docs/admin/invite-onboard), [Design a permission model](/docs/admin/permission-model), [Permissions](/docs/concepts/permissions).
