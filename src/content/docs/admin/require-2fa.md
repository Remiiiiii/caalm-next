---
title: "Require and recover 2FA"
description: "Org policy, setup coaching, and unlock paths that do not invent backdoors."
section: admin
audience: "Admins"
---

2FA is only effective if it is normal.

## Require it

1. Complete setup on admin accounts first
2. Enable organization “Require 2FA” in System Settings when ready
3. Communicate the authenticator app expectation in invite emails / onboarding docs
4. Give people a practice window when possible

## Coach setup

- Settings → Two-factor setup
- Scan QR / enter secret in authenticator
- Confirm a code successfully
- Store recovery materials per policy

## Recovery principles

- Prefer supervised recovery with identity verification
- Re-establish a new second factor
- Log the recovery event administratively
- Do not create permanent “2FA optional for executives” exceptions

User help: [2FA locked out](/docs/troubleshooting/2fa-lockout).
