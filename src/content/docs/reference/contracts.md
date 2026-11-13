---
title: "Contracts"
description: "Browse, upload, assign, review, renew, and prove contract hygiene in CAALM."
section: reference
audience: "Managers, Admins, Reviewers"
---

Contracts are one of CAALM’s primary systems of record.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| All Contracts | `/contracts` | Org-visible contract library (permission-gated) |
| My Contracts | `/my-contracts` | Ownership / scoped working set |
| Negotiate | `/contracts/[id]/negotiate` | Comment, redline, and invite before formal review |
| Approvals | `/contracts/approvals` | Review and approve proposals |
| Government Contracts | `/contracts/government-contracts` | SAM.gov opportunity search |
| RFP Proposals | `/contracts/proposals` | Shred a solicitation, certify the matrix, draft, export |

## Core workflow

1. **Upload / create** with the best metadata you have ([how to upload a contract](#upload-a-contract))
2. **Attach evidence** (the PDF/doc is the point)
3. **Assign owner** and confirm department/division context
4. **Set expiration / key dates**
5. **Send through review/approval** when required
6. **Send for signature** when the parties must execute ([E-signature](/docs/reference/e-signature))
7. **Monitor** via dashboard + notifications
8. **Renew or close** with updated evidence

## Upload a contract

Upload a signed agreement and let CAALM fill in the details. You review every field before anything is added.

```video
{"embed": "https://watchclueso.com/embed/twj9jyiks6cc0whn", "poster": "/assets/video/docs/upload-contract-poster.webp", "title": "How to upload a contract in CAALM", "duration": "1:13"}
```

1. **Start an upload.** From any page, click the **Upload Contract** icon in the top toolbar, then pick a contract type (for example, **Government Contract**).
2. **Attach the file.** Click to upload or drag in your file. CAALM reads the contract and fills in the form. When it shows **File ready**, click **Next**.
3. **Set owner, expiration, and department/division.** On **Contract Basics**, check **Department** and **Expiry date** and choose a **Division**. **Department Owner** is optional.
4. **Review AI field suggestions.** Fields tagged **CAALM Filled** are suggestions from your document. Step through each section, correct anything that's wrong, and click **Next**.
5. **Upload.** On **Review**, use **Edit** to jump back to any step, then click **Upload Contract**. You decide when the contract is added: it uploads only when you click this button.
6. **Confirm.** CAALM shows **Contract Uploaded Successfully** once the contract is uploaded and processed.

> [!NOTE] The form auto-saves your progress as a draft, so you can leave and come back. A draft becomes a contract when you click **Upload Contract**.

## Actions you may see on a record

Depending on permissions, contract file actions can include: open details, download, rename, share, re-assign, review, approval workflow, **Send for signature** (when status is Pending Signature and you have `contracts.sign`), delete.

> [!WARNING]
> Deleting is not a cleanup convenience — it is an evidentiary event. Prefer correct status transitions unless policy says otherwise.

## Metrics and attention strips

Contracts pages often surface counts and “needs attention” cues. Use them as triage, then verify on the record. Dashboards are only as honest as dates and owners.

## Permissions

- `contracts.view`
- `contracts.create`
- `contracts.edit`
- `contracts.review`
- `contracts.approve`
- `contracts.sign`

## Ask CAALM on contracts

With `ai.chat` plus the matching contracts permission, [Ask CAALM](/docs/reference/assistant) can help without leaving the header panel:

- Search and open a contract; ask a question about one agreement; summarize; compare versions; list obligations
- Suggest fields from the attached file (**review only** — nothing saves until you confirm an update)
- Propose create/update, renew, counterparty invite, send for signature, approve, or export — each write shows a **Confirm** step first

Upload intake can also suggest fields with AI. A person must review those suggestions before save. Manual entry always remains available if AI is off or over quota.

## Quality checklist before you walk away

- [ ] File present and readable
- [ ] Owner current
- [ ] Expiration correct
- [ ] Status truthful
- [ ] Approval state matches reality
- [ ] Related tasks/dates on calendar if your team uses that discipline

Related: [Ask CAALM](/docs/reference/assistant), [Negotiate contracts](/docs/reference/negotiate), [Clause Library](/docs/reference/clause-library), [Contract templates](/docs/reference/contract-templates), [Funding and retention](/docs/reference/funding-retention), [Approvals](/docs/reference/approvals), [SAM.gov](/docs/reference/sam-gov), [RFP proposals](/docs/reference/rfp-proposals).


## Intake standards (recommended)

When a contract enters CAALM, require:

1. Legal/entity names exactly as executed
2. Effective date and expiration date (or explicit evergreen policy note)
3. Internal owner (human) and backup owner
4. Division/department
5. Primary PDF/doc evidence
6. Renewal lead time your org needs (30/60/90 days)

If intake is optional, dashboards become fiction.

## Re-assignment etiquette

Re-assign when:

- Owner leaves
- Program moves divisions
- Temporary coverage is ending

Always leave a short reason in whatever comment/activity field your workflow uses. Future auditors read silence as confusion.

## Working My Contracts vs All Contracts

- **My Contracts** is for execution
- **All Contracts** is for oversight and search across scope you are allowed to see

Managers may only get the scoped tools — that is normal.

## Approvals handoff

A contract should not sit in “draft/review” because people are negotiating in email forever. Prefer:

- Keep wording work in [Negotiate](/docs/reference/negotiate) until terms are real
- Click **Send for review** when the draft is ready for the approval queue
- Update CAALM when interim decisions happen offline

The anti-pattern is an approved-looking record whose file is still a redlined draft.

## Signature handoff

When approvals complete, status often becomes **Pending Signature**. People with `contracts.sign` open **Send for signature**, place stamps, and email signers through [CAALM Execute](/docs/reference/e-signature). When every signer finishes, the contract activates and a sealed signed PDF is retained.
