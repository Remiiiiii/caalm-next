---
title: "RFP proposals"
description: "Turn a SAM.gov opportunity into a compliance matrix, certify every shall/must/will, then draft and export a bid package."
section: reference
audience: "Capture teams, Executives, Admins"
---

**RFP proposals** (`/contracts/proposals`) is the bid workspace. You shred a solicitation into a compliance matrix, a person certifies every row, then CAALM drafts sections from your approved library.

This is **not** the same screen as [Approvals](/docs/reference/approvals). Approvals is the internal review queue for contracts and licenses you already own. RFP proposals is the bid you are still writing.

> [!IMPORTANT]
> AI can shred language and draft sections. A person still certifies the matrix and reviews the draft before you export. Do not send an unreviewed packet to a funder.

## Where to work

| Screen | Path | Purpose |
|---|---|---|
| RFP Proposals | `/contracts/proposals` | List, start, and open bid workspaces |
| Proposal workspace | `/contracts/proposals/[id]` | Matrix, sections, library, export |
| Government Contracts | `/contracts/government-contracts` | Find a SAM.gov notice, then **Generate proposal** |
| Funding & Retention | `/contracts/funding-retention` | Track the pursuit; link a won bid to a proposal |

## How a bid moves

1. **Start** — from a SAM.gov notice (**Generate proposal**) or **New proposal** with a title (paste solicitation text if you have it)
2. **Shred** — CAALM pulls shall / must / will lines into a compliance matrix
3. **Certify** — a person marks each row (response type + status) until every row is certified
4. **Draft** — with `proposals.generate`, run section drafting from your certified matrix and library
5. **Edit** — fix the markdown in each section; keep the matrix truthful
6. **Export** — PDF or Word (`proposals.export`) after a human review
7. **Win path** — if the award lands, put the executed agreement into [Contracts](/docs/reference/contracts) with an owner and dates

## Library

People with `proposals.library_manage` add reusable **capability** and **past performance** snippets. Drafting pulls from that library so every bid does not start from a blank page.

## Permissions

| Key | What you can do |
|---|---|
| `proposals.view` | Open the list and workspace |
| `proposals.create` | Start a proposal (including from SAM.gov) |
| `proposals.edit` | Edit matrix rows, section drafts, and status |
| `proposals.generate` | Run shred and section drafting |
| `proposals.export` | Download PDF or Word |
| `proposals.library_manage` | Add and edit library content |

Related: [SAM.gov](/docs/reference/sam-gov), [Funding and retention](/docs/reference/funding-retention), [Approvals](/docs/reference/approvals), [Contracts](/docs/reference/contracts).
