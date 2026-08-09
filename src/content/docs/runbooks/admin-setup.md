---
title: "Runbooks admin setup"
description: "Permissions, Appwrite collection, and first published runbooks."
section: runbooks
audience: "IT, Admins, On-call"
---

## 1. Assign permissions

Grant through roles in the database (no code bypasses):

| Permission | Meaning |
|---|---|
| `it.view_runbooks` | Browse and open runbooks |
| `it.manage_runbooks` | Create, edit, publish, archive |

IT staff who already hold incident permissions usually need both.

## 2. Create the Appwrite collection

In Appwrite Console, create a collection/table (suggested id: `runbooks`) with attributes:

| Attribute | Type | Notes |
|---|---|---|
| `title` | string | required |
| `slug` | string | required, unique per org recommended |
| `summary` | string | short description |
| `service` | string | auth, appwrite, payments, … |
| `severity` | string | low / medium / high / critical |
| `status` | string | draft / published / archived |
| `symptoms` | string[] or string | searchable symptom phrases |
| `stepsJson` | string (large) | JSON array of steps |
| `verification` | string | success checks |
| `escalation` | string | who/when to escalate |
| `ownerId` | string | author/owner user id |
| `orgId` | string | tenant scope |
| `tags` | string[] | optional |
| `integrationKeys` | string[] | pagerduty, opsgenie, … |
| `lastReviewedAt` | string (ISO datetime) | optional |

Set env:

```
NEXT_PUBLIC_APPWRITE_RUNBOOKS_COLLECTION=your_collection_id
```

> [!NOTE]
> If the collection is not configured yet, the IT CMS uses a safe in-memory store with seed runbooks so the UI remains usable in development. Production should use Appwrite.

## 3. Publish the first five

Start with high-frequency failures:

1. Sign-in / 2FA loop
2. Appwrite / database unavailable
3. File upload failures
4. Notification pipeline quiet
5. Failed deployment rollback

## 4. Link from incident process

Train on-call to open Runbooks from Incident Management, then update Post-Mortems with runbook gaps.
