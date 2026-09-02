---
title: "Approvals and proposals"
description: "Queues, decision flows, and how approvals create accountability without theater."
section: reference
audience: "Reviewers, Approvers, Admins"
---

Approvals turn “someone uploaded a thing” into “the organization accepted a thing.”

## Queues

- Contracts: `/contracts/approvals`
- Licenses: `/licenses/approvals`

These queues typically require review and/or approve permissions.

## What a healthy approval looks like

1. Submitter provides complete metadata + file
2. Reviewer checks correctness (not vibes)
3. Approver makes an explicit decision
4. System retains who decided and when
5. Downstream monitoring begins from truthful dates

## Separation of duties

CAALM can constrain toxic combinations of powers. If you cannot approve your own submission, that is often intentional governance.

## Decision hygiene

- Reject with a reason people can fix
- Do not bounce items silently
- Do not approve to “clear the queue”
- Escalate policy questions; do not invent policy in the comment box

## When approvals stall

Common causes:

- Approver lacks permission
- Approver left the org
- Record metadata too incomplete to decide
- Stakeholders disagree offline and never return to CAALM

Admin response: reassign ownership, fix roles, or convene a decision — do not leave limbo records aging in place.

Related: [Contract templates](/docs/reference/contract-templates), [Contracts](/docs/reference/contracts), [Funding and retention](/docs/reference/funding-retention).

