---
title: "Demo vs production differences"
description: "Why the sandbox behaves differently — and how to evaluate fairly."
section: troubleshooting
audience: "Evaluators, Admins"
---

Demo exists to teach and sell. Production exists to operate. Mixing expectations creates fake bugs.

## Expected differences

| Area | Demo | Production |
|---|---|---|
| Data | Sample / disposable | Real, auditable |
| 2FA | Often skipped | Enforced for protected access |
| Integrations | Often disabled | Can be live |
| Users | Sandbox identities | Invited org users |
| Consequences | Low | Financial/compliance real |

## Evaluating correctly

Score CAALM on whether your real workflow becomes clearer:

- owner visibility
- deadline discipline
- approval accountability
- auditability
- role-appropriate scopes

Do not score it on whether demo skipped a security step you will require in production.

## Migrating from demo enthusiasm to production

Use [Stand up a new organization](/docs/admin/standup). Do not “just turn the demo into prod.”
