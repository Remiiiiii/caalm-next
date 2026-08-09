---
title: "Writing a good runbook"
description: "Symptoms, steps, verification, and escalation that work at 2 a.m."
section: runbooks
audience: "IT, Admins, On-call"
---

Write for someone who has never fixed this system before and is under time pressure.

## Required sections

1. **Title** — name the failure or task (“Restore Appwrite backup”, not “Database stuff”)
2. **Service** — which system (auth, storage, payments, deployments, notifications)
3. **Symptoms** — how people notice it
4. **Steps** — ordered actions, including commands when needed
5. **Verification** — how to know it is fixed
6. **Escalation** — when to stop and call whom

## Style rules

- Prefer short imperative sentences (“Restart the worker”, “Check the last deploy”)
- Assume stress: no essays, no buried decision points
- Include decision branches explicitly (“If status is 401, go to step 4”)
- Never put live secrets in the runbook — point to a vault / secret manager
- Update after every real incident

## Checklist

| Item | Why it matters |
|---|---|
| Clear symptoms | Helps the right runbook get opened |
| First checks | Stops random restarts |
| Ordered steps | Consistency under stress |
| Verification | Prevents “looks fine” false closes |
| Escalation | Protects people from stuck loops |
| Owner + review date | Keeps docs from rotting |

> [!TIP]
> After you solve a novel outage, write the runbook *before* you forget the steps. Future-you is the primary customer.
