---
title: "Organization Admin guide"
description: "Invites, settings, and day-to-day org operations that keep CAALM usable."
section: guides
audience: "Organization Admin"
---

Organization Admins make CAALM livable. Executives set direction; you keep the machine running.

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
- System settings (as permitted)
- Billing & Integrations when you hold `settings.billing` / `settings.integrations`

### 4. Unblock without over-granting
When someone hits a lock:
1. Open their access reality (roles/permissions)
2. Identify the missing permission key
3. Grant the minimum role/permission change
4. Document why

## Anti-patterns

- Creating a shadow Super Admin culture
- Leaving invites pending for weeks
- Connecting Outlook before calendar training
- Treating billing changes casually

## Daily / weekly checklist

- [ ] Pending invites cleared or nudged
- [ ] New users completed 2FA
- [ ] No unexplained role changes
- [ ] Expiry widgets reviewed with owners
- [ ] Integration health glanced at

See: [Invite and onboard users](/docs/admin/invite-onboard), [Design a permission model](/docs/admin/permission-model).
