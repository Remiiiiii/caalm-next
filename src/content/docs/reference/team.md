---
title: "Team and user management"
description: "Invite users, see reporting and assignment graphs, manage roles, and assign tasks."
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

### Table vs diagram

Toggle **table** and **diagram** on User Management. The table is the working list (name, assigned by, assigned date, last active). The diagram is an org map you can search.

Two diagram modes:

| Mode | What the lines mean |
|---|---|
| **Reporting** | Who each person reports to at work. Solid = manager. Dashed = matrix manager |
| **Assignment** | Who granted the CAALM login or role. “System” is automatic setup |

People with edit access can reconnect lines on the graph (move or cut a reporting/assignment edge). Treat that like an HR change: wrong lines create wrong owners later.

## Role management jobs

- Create/maintain roles
- Attach permission keys
- Keep Super Admin / Org Admin permission sets explicit and complete in the database

## Tasks

Assign Tasks (`/team/tasks`) is the operational to-do board: search, filter pills, a sortable table, and bulk actions on selected rows.

Task assignment uses event-related permissions (`events.create` / `events.invite` patterns) to coordinate work tied to operational timing.

## Golden path

Invite → correct role → correct division → 2FA complete → verify home dashboard → verify View My Access.

Playbook: [Invite and onboard users](/docs/admin/invite-onboard).
