# CAALM pricing workshop guide

CAALM-specific inputs for Starter and Growth tier decisions. Pair with `.cursor/skills/founder-pricing-strategy/SKILL.md` and `caalm-shipped-pricing-context.md`.

## Product scope

**CAALM** combines:

- **CLM:** contracts, licenses, funding retention, approvals, e-sign, audits
- **Shipped nonprofit CRM:** constituents, gifts, campaigns, volunteers, development dashboard, fund / Form 990 worksheet settings

## Billing model (today)

- **Per workspace** (not per seat)
- **Enforced caps:** users, departments, active contracts, active licenses (Starter only), storage, AI document extractions per month
- **Pilot:** 90-day Growth trial; AI capped at **100/month** during trial

**Nonprofit in code:** Live routes and permissions exist. There are **no** separate constituent/gift tier meters in `TIER_LIMITS`. NPO features ride the same plan plus RBAC.

## What's shipped (price against this only)

| Area | Shipped |
|------|---------|
| Contracts, approvals, negotiate, templates, clauses | Yes |
| Licenses (allocate/renew on Growth+) | Yes |
| Funding and retention, SAM pursuits | Yes |
| E-sign (Execute), calendar, files, search, news | Yes |
| Audits / audit readiness, analytics dashboards | Yes |
| HubSpot CRM origin | Growth+ (on card) |
| Salesforce CRM origin | Enterprise (sales-led) |
| Constituents, import, stewardship, consent | Yes (permission-gated) |
| Gifts, campaigns, development dashboard | Yes |
| Volunteers / shifts | Yes |
| Fundraising Intelligence (`ai.fundraising`) | Yes |
| Restricted funds + 990 mapping / worksheet CSV | Yes |
| Journal export (CSV/IIF) | Yes (download only; not live GL sync) |

## Limits (Starter vs Growth)

Source of truth: `public/PRICING.md`, `src/lib/stripe/prices.ts`.

| Cap | Starter | Growth |
|-----|---------|--------|
| Price | $79/mo | $449/mo |
| Users | 10 | 100 |
| Departments | 3 | 6 |
| Active contracts | 100 | 2,500 |
| Active licenses | 100 | Unlimited |
| AI extractions/mo | 50 | 500 (100 during pilot) |
| Storage | 10 GB | 100 GB |

**Add-ons:** $3/user/mo, $10 per 100 GB/mo, Starter priority support +$199/mo.

## What we refuse to claim

Do **not** put on Starter/Growth cards or sales one-pagers as “included now”:

- 990 e-file, payroll, general ledger, live Intacct–QuickBooks two-way sync
- Wealth engine / automated wealth screening (OK: **import a wealth screen**, **990 worksheet**)
- SSO/SAML, customer API/webhooks, report scheduling, 99.9% SLA on self-serve tiers (Enterprise/custom only when shipped)
- Anything on the NPO roadmap that is not in `NPO_CLAIMED_SHIPPED_ROUTES` plus docs

## Pricing strategy verdict (Starter vs Growth)

### 1. Value metric (keep)

Per-workspace fits CLM buyers (many read-only viewers). Nonprofit buyers often think in seats and records; the user cap still forces upgrades.

**Copy suggestion for nonprofit pages:** “CRM included on workspace plan; limits are users, storage, contracts, and AI extractions.”

### 2. Starter ($79) — who and job

- **Who:** Small org or single program; ≤3 departments; light contract/license load; no HubSpot pipeline
- **Job:** Contract automation entry
- **Include on card:** Intake, approvals, renewals, 50 AI extracts, custom roles, basic dashboards
- **Do not imply:** Full license ops at scale, CRM as “enterprise donor platform,” finance system replacement

### 3. Growth ($449) — who and job

- **Who:** Multi-department ops plus optional fundraising stack
- **Job:** HubSpot origin, unlimited licenses, 500 AI extracts, 100 GB, department views
- **Positioning:** Natural home for **hybrid CLM + NPO** (nothing in Stripe splits NPO today). Use “operations + development team” until you meter gifts/constituents

### 4. Willingness to pay (honest)

- **CLM-only comparables:** Mid-market often **$300–800+/mo** for similar workspace CLM. Growth at **$449** is plausible if HubSpot and license workflows are highlighted.
- **NPO-only comparables (Bloomerang-class):** Roughly **$125–500+/mo** by records/users. Starter at **$79** is aggressive if donor CRM is the equal hero; anchor on CLM value or risk “cheap = toy.”
- **Hybrid (FQHC, human services):** **Growth $449** is the story: one workspace for grant contracts and donors. Starter feels tight at 10 users once dev, finance, and programs all need access.

### 5. Packaging fixes (no price change required yet)

1. **Public `PRICING.md` / landing:** Add a “Nonprofit and fundraising (included)” block under Growth; “core CRM on all paid plans” only if you will not meter it (matches code today).
2. **Separate AI caps in copy:** Contract **extractions** vs `ai.fundraising` scores. If scores are not extraction-metered, say so; if you meter later, say “meter TBD.”
3. **Starter → Growth triggers:** >10 users, >100 licenses, HubSpot, >100 contracts, need department dashboards (match enforcement hooks).
4. **Enterprise:** Keep nonprofit + Salesforce + custom limits; do not fold SSO/API into Growth until shipped.

### 6. Price tweak options (only if repositioning)

- **Keep $79 / $449** if ICP stays compliance + contracts with NPO as expansion, not lead wedge.
- **Raise Starter to ~$99–129** only if marketing leads with donor CRM and cites competitor pricing; otherwise CLM-only buyers may churn.
- **Optional “Development add-on” later** (constituent row cap or gift volume) instead of inflating base Growth before meters exist in code.

## One-line recommendation

Treat **Growth ($449)** as the priced “full CAALM” tier (CLM + shipped NPO). Keep **Starter** as contract/license entry. Update public pricing copy to list shipped nonprofit features and repeat out-of-lane refusals without claiming payroll, e-file, GL, or wealth engine.
