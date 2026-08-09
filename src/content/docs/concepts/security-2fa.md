---
title: "Security and 2FA"
description: "Sessions, two-factor authentication, and how protected routes stay protected."
section: concepts
audience: "Everyone, Admins"
---

CAALM protects sensitive compliance data. Authentication is not theater.

## Building blocks

- **Appwrite session** — proves you signed in
- **2FA completion** — proves a second factor was satisfied when required
- **Permission checks** — prove you are allowed to do the specific action
- **Audit trails** — record meaningful changes for later review

## Two-factor authentication (2FA)

Plain definition: 2FA means signing in needs your password **and** a rotating code from an authenticator app (or equivalent second factor).

In CAALM:

- Users set up 2FA under Settings
- Protected application areas expect 2FA completion
- Admins can require 2FA at the organization policy level
- Demo sandbox may skip 2FA to ease evaluation

## What to do as a user

1. Set up 2FA immediately after first login when prompted.
2. Store recovery options according to your org’s policy (not in a shared Slack channel).
3. If locked out, use the official recovery path — see [2FA locked out](/docs/troubleshooting/2fa-lockout).

## What to do as an admin

1. Decide whether 2FA is mandatory before inviting dozens of users.
2. Train people during onboarding, not during an outage.
3. Never “temporarily disable security” as a culture. Temporary becomes permanent.

Related: [Require and recover 2FA](/docs/admin/require-2fa).
