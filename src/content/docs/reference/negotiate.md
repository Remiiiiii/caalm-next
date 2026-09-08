---
title: "Negotiate contracts"
description: "How to review wording, invite a counterparty, comment, redline, and send a draft for formal approval."
section: reference
audience: "Contract managers, Legal, Admins, Reviewers"
---

Negotiate is the **working table** for a draft agreement before formal internal review.

Use it when wording is still changing. Use [Approvals](/docs/reference/approvals) when the organization needs an official decision.

| Idea | What it means |
|---|---|
| Negotiate | Sticky notes and proposed wording on a draft |
| Open PDF | The letterheaded, formatted copy for reading or printing |
| Send for review | Wording negotiation is ready enough to start approvals |

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| Negotiate (internal) | `/contracts/[id]/negotiate` | Manager workspace: versions, comments, invite, send |
| Counterparty link | `/negotiate/[token]` | Guest review without a CAALM login |
| Contracts list | `/contracts` | Open Negotiate from the row action menu |
| Approvals | `/contracts/approvals` | Where the draft goes after Send for review |

You can open Negotiate when the contract lifecycle is `draft` or `negotiation`. After Send for review, the lifecycle becomes `under_review` and the Negotiate action leaves the contracts menu.

## Who can do what

| Person | Typical permissions | Can do |
|---|---|---|
| Contract / agreement manager | `contracts.view` + `contracts.edit` | Invite, comment, resolve, accept redlines, send |
| Internal viewer | `contracts.view` only | Read the workspace; no invite/send |
| Approver override | also `contracts.approve` | Send even if some comments are still open |
| Invited counterparty | magic link (no account) | Read draft, leave shared comments/redlines |

> [!TIP]
> Internal-only comments stay hidden from the counterparty link. Use them for team coaching, not for vendor-facing feedback.

## Screen map

The internal page has three panes that scroll on their own (the side rails do not grow with a long document):

1. **Left — Versions**
   - Snapshot history (`v1`, `v2`, …)
   - Compare previous → current
   - Jump to clause list with “Section X of Y”
2. **Center — Draft text**
   - Metadata card (party, value, dates, and so on)
   - Numbered sections, bullets, bold defined terms
   - Click a paragraph or bullet to select it
   - Open PDF footer for the letterheaded file
3. **Right — Comments**
   - Open / Resolved tabs
   - Filters: All, This section, Selected
   - Comment + optional redline composer

## Happy path (manager checklist)

1. Create or open the draft (wizard submit or Contracts → **Negotiate**)
2. Skim sections with **Jump to clause**
3. Invite the counterparty if outside counsel or a vendor must comment
4. Select a paragraph → leave comments or redlines
5. Resolve settled threads; **Accept redline** when you agree on exact wording
6. Confirm open comments are cleared (or you have approve permission to override)
7. Click **Send for review**
8. Continue in [Approvals](/docs/reference/approvals)

## Step-by-step: every action

### Select a paragraph or bullet

1. Click the paragraph or a single bullet in the center pane
2. It highlights in orange
3. The comment composer unlocks

Use one bullet when feedback applies to that item only (for example one reporting requirement).

### Add a shared comment

1. Select the paragraph
2. Type the comment
3. Leave **Internal only** unchecked
4. Click **Add comment**

Shared comments appear for the counterparty.

### Add an internal-only comment

1. Select the paragraph
2. Type the comment
3. Check **Internal only — hide from counterparty**
4. Click **Add comment**

Use this for notes like “Do not reopen indemnity.”

### Suggest a redline

A redline is a proposed replacement for the selected text.

1. Select the paragraph
2. Write a short comment explaining why
3. Put the full replacement sentence in **Optional replacement text (redline)**
4. Submit

Open redlines show as struck-through old text plus inserted new text in the draft.

### Resolve a comment

Use Resolve when the issue is settled and you do not need to change the stored draft text (or the change already happened).

1. Open the comment card
2. Click **Resolve**

Resolved items move to the Resolved tab. For users without `contracts.approve`, open comments block **Send for review**.

### Accept a redline

Use Accept when you agree with the proposed wording and want it written into a new draft version.

1. Open a comment that has a redline
2. Click **Accept redline**

What happens:

- CAALM creates a new version (`v2`, `v3`, …) with the replacement applied
- Older versions stay available for Compare
- The letterheaded PDF is **not** auto-rewritten — use Open PDF / re-export when reviewers need the formal file to match

### Compare versions

1. Select a version in the left list
2. Click **Compare vN → vM** when offered
3. Read adds/removes in the Diff area

Version cards also show `+N/−N` summaries after redline rounds.

### Jump to clause

1. Use **Jump to clause** on the left
2. Click a real section title (for example `2. GRANT AMOUNT`)
3. The center pane scrolls to that section

As you scroll the draft, the active section and “Section X of Y” stay in sync.

### Filter comments

| Filter | Shows |
|---|---|
| All | Every comment in the thread list |
| This section | Comments anchored in the clause on screen |
| Selected | Comments on the paragraph you clicked |

Clicking a numbered marker in the draft jumps to that comment.

### Open PDF

Click **Open PDF** (floating button or footer link) to view the formatted letterheaded file. Negotiate stays the place to edit wording via comments/redlines.

### Invite a counterparty

1. Click **Invite**
2. Enter their email
3. Click **Create link** (links expire after 14 days)
4. Copy and send the `/negotiate/[token]` URL

They see **Viewing as Counterparty**. They do not need a CAALM account.

## Counterparty journey

1. Open the invite link
2. Read the draft snapshot (same negotiation text the manager sees for shared content)
3. Select a paragraph or bullet
4. Leave a shared comment and optional redline
5. Refresh later to see resolutions and newer draft text after accepted redlines

They **cannot**:

- See internal-only comments
- Invite others
- Send for review
- Run the manager resolve/accept tools from the internal workspace chrome

## Example dialogue

**Manager → counterparty (email)**

> Here’s the draft Grant Agreement. Comment on Grant Amount and Reporting with the link below.

**Counterparty (on amount paragraph)**

> Comment: We need $650k for the second county.  
> Redline: “…total of $650,000.00…”

**Manager (in CAALM)**

> Accepts the amount redline → creates `v2`  
> Internal note on indemnity: “Keep as-is per counsel memo.”  
> Shared reply on reporting: “Quarterly works if mid-year narrative stays.” → Resolve when agreed

**Manager close-out**

> Clears remaining open comments → **Send for review**

## Send for review rules

| Situation | Result |
|---|---|
| Lifecycle is `negotiation`, no open comments | Send enabled |
| Open comments remain, user has `contracts.approve` | Send still allowed (override) |
| Open comments remain, no approve permission | Send disabled until resolved |
| Lifecycle is already `under_review` | Send control is gone; use Approvals |

## What happens after Send for review

1. Lifecycle becomes `under_review`
2. Contract status becomes `pending-review`
3. CAALM starts the approval workflow when configured
4. Negotiate leaves the contracts action menu for that record
5. Version and comment history remain as the paper trail
6. Day-to-day work moves to [Approvals](/docs/reference/approvals)

> [!WARNING]
> Send for review closes the wording round. It does not automatically reprint the letterheaded PDF from every accepted redline. If approvers must see the formal PDF match the latest text, regenerate or re-export that file before or during review.

## Permissions checklist

- `contracts.view` — open Negotiate and read
- `contracts.edit` — invite, comment, resolve, accept, send
- `contracts.approve` — send while open comments remain (override)

See also: [Permissions catalog](/docs/reference/permissions-catalog).

## Quality checklist before you leave Negotiate

- [ ] Sections match the real agreement structure
- [ ] Counterparty saw only what they should (no private notes in shared comments)
- [ ] Open threads are resolved or intentionally overridden by an approver
- [ ] Accepted redlines created the version you expect
- [ ] Formal PDF matches the draft if reviewers will open the file
- [ ] Send for review completed and the record appears in Approvals

## Related docs

- [Contracts](/docs/reference/contracts)
- [Contract templates](/docs/reference/contract-templates)
- [Clause Library](/docs/reference/clause-library)
- [Approvals](/docs/reference/approvals)
- [Lifecycle of a record](/docs/concepts/lifecycle)
