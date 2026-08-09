---
title: "Team and user management"
description: "Invite users, manage roles, and assign tasks without creating access chaos."
section: reference
audience: "Admins"
---

People administration is where most long-term CAALM pain is created or prevented.

## Screens

- User Management: `/dashboard/user-management`
- Role Management: `/dashboard/admin/roles`
- Assign Tasks: `/team/tasks`

## User management jobs

- Invite with role + division
- Edit profile/ops fields
- Assign roles
- Deactivate departed users

Permissions: `users.view`, `invite`, `edit`, `assign_roles`, `deactivate`.

## Role management jobs

- Create/maintain roles
- Attach permission keys
- Keep Super Admin / Org Admin permission sets explicit and complete in the database

## Tasks

Task assignment uses event-related permissions (`events.create` / `events.invite` patterns) to coordinate work tied to operational timing.

## Golden path

Invite → correct role → correct division → 2FA complete → verify home dashboard → verify View My Access.

Playbook: [Invite and onboard users](/docs/admin/invite-onboard).
