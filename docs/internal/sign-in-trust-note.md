# Trustworthy sign-in and two-factor (internal)

**Audience:** Security reviewers, IT, compliance  
**Last updated:** 2026-10-04 (PRD section 3 — PR #185)

## What changed in section 3

### Session-bound 2FA (3.1)

`/api/2fa/setup`, `/api/2fa/verify`, `/api/2fa/status`, and `/api/2fa/disable` require a real Appwrite session. The server uses the session user’s account id; a body `userId` that belongs to someone else returns **403**. Unauthenticated callers get **401**.

### No test backdoors in production (3.2)

`/api/2fa/test` and `/api/2fa/test-totp` return **404** when `NODE_ENV !== "development"`. The old verify “test mode” that accepted any 6-digit code for unknown users is removed.

### Audit trail (3.3 / 3.4)

Security actions write `module: "auth"` audit rows:

| Action | Event title |
|--------|-------------|
| Admin revoke sessions | Sessions revoked |
| Admin password reset email | Password reset emailed |
| User disables / resets 2FA | Two-factor authentication reset |
| User finishes 2FA setup | Two-factor authentication enabled |

Each row includes **actor** (`user_id` / name / email) and **target** (`target_id` / `target_label`).

## Authz baseline

Section 3 removed the `2fa/*` routes from the unguarded grandfather list (session-gated). Remaining gaps stay on the ratchet from section 2.

## Roadmap link

**IT Development → Platform Readiness Roadmap**, section **Trustworthy sign-in and two-factor** (`?catalog=prd`).
