# Security questionnaire starter (internal)

Plain-language draft for vendor reviews. **Not** a SOC 2 report. Linked from Platform Readiness §6 and Enterprise pricing FAQ (PRD §6.2).

**Last updated:** 2026-10-05 (after PRD §1–§6 batch work: PRs #180, #182, #185, #181, #184, #183)

## Product summary

CAALM is a contract and license management web app (Next.js) with Appwrite for auth, database, and storage. Billing uses Stripe.

## Authentication and access

| Topic | Status (Oct 2026) | Notes |
| --- | --- | --- |
| Login | Shipped | Appwrite sessions |
| RBAC (role-based access control) | Shipped | Permissions stored in database; no role-name bypasses in code |
| Two-factor authentication (2FA) | Shipped | Session-bound setup/verify/disable (PRD §3 / PR #185); test backdoors blocked outside development; enable/disable writes `auth` audit rows |
| SSO / SAML | Not self-serve | Enterprise: Contact sales; Settings shows Coming soon until a real IdP is wired (CLM §12 after PRD handoff) |

## Data isolation

| Topic | Status | Notes |
| --- | --- | --- |
| Org-scoped lists | Shipped | PRD §1 / PR #180 — contract, license, files, and invite paths filter by `orgId`; CI seeds two orgs and fails if the filter is dropped |
| Encryption in transit | Shipped | HTTPS (TLS) |
| Encryption at rest | Provider | Appwrite Cloud / host defaults |

## Application security

| Topic | Status | Notes |
| --- | --- | --- |
| API permission coverage | Improved — residual debt | PRD §2 / PR #182 cut the unguarded baseline from **119 → 65** routes; CI ratchet (`pnpm test:api-authz`) forbids growth |
| Audit log | Shipped | Production mock defaults off (PRD §4 / PR #181); sample/illustrative charts use **Sample data** / **DEMO** labels |
| IT portal metrics | Honest empty / Preview | PRD §5 / PR #184 — no fake CPU/uptime; Appwrite connectivity + process signals only; unfinished IT pages hidden from primary nav (deep links show Preview) |
| Integrations honesty | Shipped (UI) | PRD §6 / PR #183 — SSO/API cards never show Connected without a real connection; Contact sales + roadmap links |
| Penetration test | Not completed | Schedule before enterprise claims |

## Hosting and operations

- **Hosting:** Vercel (app) + Appwrite Cloud (data plane) unless customer-specific deployment.
- **Backups:** Follow Appwrite project backup policy; document RPO/RTO when ops runbook exists (CLM §14).
- **Incident response:** Use internal IT/on-call process; not published to customers yet.

## Known gaps (honest list)

1. **~65 grandfathered API routes** still on the authz baseline (must shrink, not grow — PRD §2 ratchet).  
2. **Host / fleet telemetry** not wired (IT portal stays Not configured for CPU/request graphs).  
3. **~30 IT placeholder shells** remain as Preview deep links (hidden from primary nav).  
4. **Customer API, webhooks, SSO/SCIM implementation** not shipped — sales-assisted; tracked on CLM §11–12 after PRD §1–5.  
5. **Penetration test** and formal uptime SLA pages not completed.  

## Certifications

- **SOC 2:** Not claimed.  
- **HIPAA / FedRAMP:** Not in scope unless contracted separately.

## Contact

Route procurement questions to sales + engineering lead; attach this doc and the Platform Readiness board status (`?catalog=prd`). Detail notes: `workspace-isolation-note.md`, `api-permission-coverage-note.md`, `sign-in-trust-note.md`, `honest-dashboards-note.md`, `it-portal-credibility-note.md`, `platform-readiness-vs-clm.md`.
