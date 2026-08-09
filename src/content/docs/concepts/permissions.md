---
title: "Permissions (not role shortcuts)"
description: "How CAALM decides what you can see and do — and why role-name shortcuts are the wrong mental model."
section: concepts
audience: "Everyone, Admins"
---

CAALM uses **permission-based access control**.

Plain definition: a *permission* is a specific key like `contracts.approve` stored in the database and granted through roles. The app checks those keys — it does not secretly say “if Super Admin, allow everything” in code.

## Why this matters

Role names are labels for humans. Permissions are the actual keys to doors.

Two people both called “manager” in conversation can have different permission sets. Two different role names can share overlapping permissions. Designing around the label creates confusion; designing around keys creates clarity.

## Where permissions live

1. **Permission definitions** — the catalog of keys
2. **Role ↔ permission assignments** — which roles get which keys
3. **User ↔ role assignments** — which people get which roles
4. **Runtime checks** — navigation, buttons, and APIs consult the user’s effective permission list

## What you will notice in the UI

- Nav items appear only when you have the matching permission
- Some items show a **lock** when they are elevated and you lack access
- Viewer experiences are often read-oriented even when screens look familiar
- “View My Access” shows the truth for *you*

## Separation of duties

Sensitive combinations (for example creating and solely approving the same class of work) may be constrained by separation-of-duties rules. If an assignment is rejected, that is governance working — not a random error.

## Admin golden rule

When someone says “make me admin so I can do X,” translate the request into the smallest permission set that enables X. Then assign that. Super Admin is a nuclear option, not a convenience snack.

See the full list: [Permissions catalog](/docs/reference/permissions-catalog).


## Navigation vs data vs API

CAALM applies permission ideas at multiple layers:

- **Navigation** — can you see the menu entry?
- **UI actions** — can you click approve/delete/invite?
- **API routes** — can your session perform the server action?

If a button is hidden, do not celebrate finding an API workaround. That is a security incident waiting to happen.

## Reading a lock icon

A lock usually means:

1. The feature exists
2. Your effective permissions do not include it
3. An admin must change role/permission assignments for you to proceed

It does **not** mean “click faster” or “use someone else’s laptop.”

## Multi-role users

Permissions union across assigned roles. That is powerful and dangerous:

- Helpful: a manager who also publishes news
- Risky: a biller who also got Super Admin “temporarily”

Review multi-role users quarterly.
