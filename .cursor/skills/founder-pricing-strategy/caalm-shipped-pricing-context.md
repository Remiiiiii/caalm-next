# CAALM pricing source of truth (repo-synced)

Use this file for **what is shipped** and **what we refuse to claim**. Code refs: `public/PRICING.md`, `src/lib/stripe/prices.ts` (`TIER_LIMITS`), `src/lib/roadmap/nonprofit/npo-shipped-routes.ts`, `src/lib/funding/finance-scope-copy.ts`, `tests/billing/pricing-catalog.test.ts`.

## Billing model

- **Per workspace** (not per user). Yearly = 20% off monthly.
- **Enforced:** users, departments, active contracts, active licenses (Starter cap), storage bytes, AI **document extractions**/month.
- **90-day Growth pilot:** self-serve Stripe trial; AI extractions **100/month** during pilot (`PILOT_AI_EXTRACTIONS_PER_MONTH`).

## Current public tiers

| | Starter | Growth | Enterprise |
|---|---------|--------|------------|
| Monthly | $79 | $449 | Custom (sales) |
| Users | 10 | 100 | Custom (default code cap 1000) |
| Departments | 3 | 6 | Custom |
| Active contracts | 100 | 2,500 | 25,000 (code default) |
| Active licenses | 100 | Unlimited | Unlimited |
| AI extractions/mo | 50 | 500 | Unlimited |
| Storage | 10 GB | 100 GB | 1 TB (code default) |

Add-ons (Starter & Growth): +$3/user/mo, +$10 per 100 GB/mo, Starter priority support +$199/mo.

## Shipped product (safe to price against)

**CLM:** contracts, negotiate, clauses, templates, approvals, e-sign (Execute), licenses (allocate/renew on Growth+), funding & retention, SAM pursuits, calendar, files, search, news, audits/audit readiness, analytics, assistant (permission-gated AI).

**Integrations on cards:** HubSpot CRM origin (Growth+). Salesforce CRM origin (Enterprise, sales-led).

**Nonprofit (shipped routes, permission-gated; no separate Stripe meters today):**

- Constituents, import, stewardship, channel consent
- Gifts, campaigns, development dashboard
- Volunteer shifts / hours
- Fundraising Intelligence (`ai.fundraising`)
- Restricted funds settings, Form 990 **worksheet** mapping/export
- Journal export CSV/IIF (download for existing ledger; not two-way sync)

## Not on self-serve pricing cards (honest packaging)

Banned or sales-only until shipped/custom:

- SSO/SAML, SCIM, customer API/webhooks, report scheduling, 99.9% uptime SLA pages
- **990 e-file**, **payroll**, **general ledger** / live Intacct or QuickBooks connector
- **Wealth engine** (OK: **import a wealth screen**, **990 worksheet**)
- Roadmap items without a live route module in `NPO_CLAIMED_SHIPPED_ROUTES`

## Positioning note

Public `PRICING.md` is CLM-forward; nonprofit CRM is shipped in-app but under-documented on pricing cards. Workshop should recommend copy changes, not fake SKUs.
