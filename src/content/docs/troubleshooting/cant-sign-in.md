---
title: "I can’t sign in"
description: "Session, password, invite, and 2FA issues — triage in order."
section: troubleshooting
audience: "Everyone, Admins"
---

Work top to bottom. Do not skip steps.

## 1. Confirm you have an account path

- Invited users must accept the invite first
- Demo users must enter through `/try`
- Production users use `/sign-in`

## 2. Password problems

- Use the product’s password reset path if available
- Check that Caps Lock / wrong email variant is not the issue
- Admins: verify the user is not deactivated

## 3. Session / cookie issues

- Try a private window
- Hard-refresh after clearing site cookies for CAALM
- Disable aggressive tracker blockers temporarily for the auth domain

## 4. 2FA challenges

- Confirm authenticator time is correct (phone time drift breaks TOTP)
- Use recovery/admin path if codes fail repeatedly
- See [2FA locked out](/docs/troubleshooting/2fa-lockout)

## 5. Redirect loops into settings

Protected routes expect 2FA completion. If you never finish setup, CAALM will keep steering you back to settings. Complete 2FA rather than fighting redirects.

## 6. Still stuck

Collect: email used, approximate time, screenshot of error, browser, whether invite was accepted. Send to an Organization Admin — not the entire company channel.
