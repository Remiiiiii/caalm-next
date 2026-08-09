---
title: "Invite and onboard users"
description: "Invites, roles, divisions, and first-login success criteria."
section: admin
audience: "Organization Admin, Super Admin"
---

Onboarding is successful only when the user can do their real job on day one — not merely when the invite email sends.

## Invite checklist

- [ ] Correct email
- [ ] Correct role(s)
- [ ] Correct division/department context
- [ ] Manager knows the person is coming
- [ ] 2FA expectation communicated

## User journey you must support

1. Receive invite
2. Accept at `/invite/accept`
3. Sign in
4. Complete 2FA
5. Land on correct home dashboard
6. Open View My Access and recognize their permissions
7. Perform one supervised real action

## If onboarding stalls

| Symptom | Likely cause | Fix |
|---|---|---|
| Invite unused | Email/spam/wrong address | Resend / correct |
| Wrong dashboard | Wrong role priority/assignment | Fix roles |
| Empty manager dashboard | Missing division | Set division |
| Locked everywhere | Under-permissioned role | Grant minimum keys |
| 2FA loop | Setup incomplete / policy mismatch | Coach setup; see 2FA docs |

## Deprovisioning

When someone leaves:

1. Deactivate promptly
2. Reassign record ownership
3. Rotate any API keys they could access
4. Review shared calendar memberships
