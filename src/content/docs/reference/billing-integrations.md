---
title: "Billing and integrations"
description: "Plans, usage meters, invoices, Gmail, Microsoft 365 Mail and Calendar, and organization API keys."
section: reference
audience: "Admins with billing/integration permissions"
---

Billing & Integrations lives under Settings and is gated by `settings.billing` and `settings.integrations` (plus related integration keys).

## Billing

- Plan tiers (starter / growth / enterprise style offerings)
- Usage meters
- Invoices and upgrades via Stripe-backed flows

Treat plan changes as financial operations with an owner — not casual clicking.

## Integrations

- **Gmail** — connect for the in-app mail panel ([Mail reference](/docs/reference/mail))
- **Microsoft 365** — Calendar tab for `/calendar` sync; Mail tab for Outlook Mail panel (separate consents)
- **HubSpot** deal-stage origin (Growth+) — creates a contract draft
- **Salesforce** origin request (Enterprise, sales-led setup)
- **Organization API keys** for controlled automation access

Demo mode may disable external integrations.

## Security notes

- API keys are credentials. Rotate on staffing changes.
- Outlook / Microsoft Mail access should be limited to people who understand mailbox and shared calendar implications.
- Document which integration is authoritative when both CAALM and an external system have dates.

Admin playbooks: [Configure billing](/docs/admin/billing), [Connect integrations](/docs/admin/integrations), [HubSpot and Salesforce CRM origin](/docs/admin/crm-integrations).
