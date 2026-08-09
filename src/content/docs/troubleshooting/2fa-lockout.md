---
title: "2FA locked out"
description: "Recover access without permanently weakening security."
section: troubleshooting
audience: "Everyone, Admins"
---

Locked out of 2FA is stressful. Slow down and use the official path.

## User self-checks

- Phone clock set automatically (TOTP is time-based)
- You are using the correct authenticator entry for CAALM
- You are not entering an expired code at the last second
- You completed initial setup successfully at least once before

## Recovery with an admin

1. Verify identity through your org’s known process
2. Admin helps reset/re-enroll second factor per policy
3. User signs in and completes setup immediately
4. User confirms they can authenticate twice

## What not to do

- Disable 2FA org-wide to unblock one person
- Share authenticator seeds in chat
- Create a permanent exception user

Admin policy: [Require and recover 2FA](/docs/admin/require-2fa).
