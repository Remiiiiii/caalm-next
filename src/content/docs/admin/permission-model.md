---
title: "Design a permission model"
description: "Assign permissions without painting yourself into a corner."
section: admin
audience: "Admins, Security"
---

A good permission model is boring, documented, and small.

## Design steps

1. List jobs-to-be-done (upload, review, approve, publish, bill, monitor)
2. Map each job to permission keys from the [catalog](/docs/reference/permissions-catalog)
3. Bundle keys into roles named after jobs, not people
4. Assign users to roles
5. Test with a non-admin account before rolling out
6. Review quarterly

## Recommended defaults

- **Few Super Admins**
- **Org Admins** for onboarding/settings
- **Managers** scoped to division work
- **Viewers** for oversight without edit
- **Content Creators** without accidental billing powers
- **IT** with IT keys, not automatic contract approve powers unless intentional

## Anti-patterns

- One mega-role “Staff” with everything
- Copying production permissions from a single power user’s accidents
- Granting approve + create everywhere “for speed”
- Fixing a lock by elevating globally

## Separation of duties

Keep create/submit powers and final approve powers from concentrating in one lonely account whenever policy requires dual control.

## Change control

Treat role edits like production changes: who asked, what changed, who approved the access model change.
