---
title: "CAALM Assistant"
description: "Ask CAALM — permission-gated help that can search, explain, and propose actions on contracts, licenses, tasks, and more."
section: reference
audience: "Users with AI permissions"
---

**Ask CAALM** is the in-app assistant. It answers product questions and, when your permissions allow, can look up live org data and propose real actions (create, renew, invite, approve). Think of it as a helpful coworker who still needs your badge for every door.

## How to open it

1. Sign in on a laptop or desktop (Ask CAALM is part of the full workspace; see [Desktop, tablet, and phone](/docs/concepts/desktop-and-mobile)).
2. Click **Ask CAALM** in the top bar.
3. You need the `ai.chat` permission. If the launcher is missing, ask an admin to grant it.

Opening Ask CAALM is not enough for every action. Searching or changing a contract still needs the matching contracts (or licenses, tasks, …) permission. See [Permissions catalog](/docs/reference/permissions-catalog).

## What it can do

Capability depends on your role’s **permissions**, not on a special “AI admin” shortcut.

### Look up and explain (reads)

- Product help for the page you are on
- Search contracts or licenses in your organization
- List items expiring soon
- Open a contract or license summary, ask a question about one agreement, compare versions, list obligations
- List tasks, calendar events, users, roles, departments, or recent audit activity (when you have those permissions)

### Propose changes (writes)

Writes never apply silently. Ask CAALM shows a **Confirm** step first. Cancel leaves the record unchanged.

Examples (each needs its own permission):

- Create or update contracts; renew; send for signature; invite a counterparty; approve when you are a reviewer
- Create or renew licenses; approve; assign an owner
- Create or complete tasks; schedule, reschedule, or cancel calendar events
- Invite people, update a profile, assign roles (when your admin permissions allow)

### Extract from a file (review only)

Ask CAALM can suggest fields from an attached contract or license file (dates, parties, and similar). Suggestions are **not** saved until you confirm a separate update. Intake upload uses the same review promise; see [Contracts](/docs/reference/contracts) and [Licenses](/docs/reference/licenses).

## AI permission keys

| Key | What it unlocks |
|---|---|
| `ai.chat` | Open Ask CAALM and chat |
| `ai.document_analysis` | Document analysis features when enabled |
| `ai.meeting_prep` | Meeting prep assistance when enabled |
| `ai.image_generate` | Image generation when enabled |
| `ai.fundraising` | Donor Intelligence scores (nonprofit) |

Domain actions still use keys like `contracts.view`, `contracts.edit`, `licenses.approve`, and so on.

## How to use it well

- Ask the business question (“What expires in 45 days for residential?”) instead of only “help”
- Name the record when you can (“summarize the Acme MSA”)
- Read the Confirm card before you commit a write
- Verify answers against the source record before you act outside the assistant
- Do not paste secrets into prompts that do not belong in chat history

## Related

- [Contracts](/docs/reference/contracts)
- [Licenses](/docs/reference/licenses)
- [Permissions catalog](/docs/reference/permissions-catalog)
- [Desktop, tablet, and phone](/docs/concepts/desktop-and-mobile)
