---
title: "Licenses"
description: "Track credentials and renewals that keep your organization legal to operate."
section: reference
audience: "Managers, Admins, Compliance"
---

Licenses are easy to underestimate until one lapses.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| All Licenses | `/licenses` | Org-visible license library |
| Department Licenses | `/licenses/department` | Division/department working set |
| Approvals | `/licenses/approvals` | Review / renew / approve flows |

## Upload a license

Upload a license or certificate and let CAALM fill in the details. You review every field, and nothing becomes Active until it's approved.

```video
{"embed": "https://watchclueso.com/embed/g3wtew38qb43wj3w", "poster": "/assets/video/docs/upload-license-poster.webp", "title": "How to upload a license in CAALM", "duration": "1:08"}
```

1. **Start an upload.** From any page, click the **Upload License** icon in the top toolbar, then pick a license type (for example, **Nonprofit & Corporate**).
2. **Attach the file.** Click the upload area and choose your file (PDF, DOCX, DOC, TXT, PNG or JPG, up to 50 MB). CAALM reads it and fills in the form; the badge shows how many fields it filled. Click **Next**.
3. **Check what CAALM filled in.** Fields tagged **CAALM Filled** are suggestions from your document. Check **Record Details**, then **Identifiers & Dates**, correct anything that's wrong, and click **Next**.
4. **Choose a department and owner.** On **Ownership & Storage**, the division is already filled in. Choose a **Department**, then the **Responsible Owner** who keeps this license current, and click **Next**.
5. **Submit for review.** On **Review**, use **Edit** to jump back to any step, then click **Submit for Review**.
6. **Confirm.** CAALM shows **Submitted for Review**. The license is **Pending Review** until it's approved under **Licenses → Approvals**, then it becomes **Active**.

> [!NOTE] The form auto-saves your progress as a draft. Open **Drafts** in the upload dialog to pick up where you left off.

## How licenses differ from contracts (in practice)

- Often tied to **permission to operate** (facility, clinical, professional)
- Renewal windows can be unforgiving
- Evidence packets may include certificates, inspection letters, or training artifacts in Files

## Lifecycle

Capture ([how to upload a license](#upload-a-license)) → assign owner → review/approve when required → [send for signature](/docs/reference/e-signature) when parties must execute → track expiry → renew with evidence → keep status honest.

Permissions commonly involved: `licenses.view`, `create`, `edit`, `delete`, `allocate`, `renew`, `sign`.

When a license sits in **Pending Signature**, people with `licenses.sign` use **Send for signature** (same CAALM Execute flow as contracts).

## Ask CAALM on licenses

With `ai.chat` plus the matching licenses permission, [Ask CAALM](/docs/reference/assistant) can:

- Look up a license, list upcoming expirations, and answer from the record you can see
- Suggest fields from an attached certificate or file (**review only** — apply changes only after you confirm)
- Propose create, renew, approve, or owner assignment — writes require a **Confirm** step

Intake upload can suggest fields the same way: human review before save, with a full manual fallback if AI is unavailable.

## Manager tip

If your department page is empty but you know licenses exist, check:

1. Your division assignment
2. Whether licenses were filed under another division
3. Filters hiding inactive/expired items
4. Missing `licenses.view`

## Executive tip

License risk should appear in leadership dashboards early enough to fund renewal work — not as a surprise the week of expiration.
