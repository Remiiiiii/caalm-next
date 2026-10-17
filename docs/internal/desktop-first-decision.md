# Decision: desktop-first product (phones = companion only)

**Status:** Accepted  
**Date:** 2026-10-16  
**Audience:** Engineering, product, Cursor agents  

## Decision

CAALM’s **signed-in app** is built for **laptop/desktop** first (about **1024px** wide and up). Phones get a **small companion set** of interrupt actions — not a second full product.

## What “companion” means

Phone work is short and interrupt-style: approve, glance at the dashboard, open a ticket, read company news. Dense work (libraries, wizards, analytics, settings, IT admin) stays on a laptop. If someone opens a dense page on a phone, they see **Open this page on a laptop**.

**Source of truth for which phone paths work:** `COMPANION_PATH_PREFIXES` and `DESKTOP_OVERRIDE_PREFIXES` in `src/lib/ui/desktop-first.ts`. User-facing explanation: `/docs/concepts/desktop-and-mobile`.

## What we are not doing

- Building a full phone layout for admin, settings, analytics, calendar, audits, or IT portal
- Expanding the companion allowlist just to avoid the “open on a laptop” screen
- Treating tablets as a separate phone product (tablets use the full app at laptop width)

## When to add a phone companion path

Only when **all** are true:

1. The job is an **interrupt** (approve, attest, renew, notify, glance), and  
2. Product agrees phones should do that job without a laptop, and  
3. You update `COMPANION_PATH_PREFIXES` (and mobile nav via `isCompanionPath`) in the **same** PR.

## If someone asks for “make settings work on mobile”

1. Point them here and to `/docs/concepts/desktop-and-mobile`.  
2. Ask whether the need is a **real companion interrupt** or a full phone redesign.  
3. Do not scaffold a phone admin UI in the same chat unless product explicitly changes this decision.

## Agent rule

Always-on Cursor rule: `.cursor/rules/desktop-first.mdc`.

## Related

- Playbook “overlooking” item: desktop-first companion routes  
- Gate UI: `DesktopFirstGate` + `DesktopRequiredScreen`  
