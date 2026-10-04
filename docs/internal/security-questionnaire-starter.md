# Security questionnaire starter (internal)

Plain-language draft for vendor reviews. **Not** a SOC 2 report. Update dates when PRD sections merge.

## Product summary

CAALM is a contract and license management web app (Next.js) with Appwrite for auth, database, and storage. Billing uses Stripe.

## Authentication and access

| Topic | Status (Oct 2026) | Notes |
| --- | --- | --- |
| Login | Shipped | Appwrite sessions |
| RBAC (role-based access control) | Shipped | Permissions stored in database; no role bypasses in code |
| Two-factor authentication (2FA) | Partial | UI exists; PRD §3 hardens setup routes and audit trail |
| SSO / SAML | Not self-serve | Enterprise: contact sales; build tracked on CLM §12 after PRD handoff |

## Data isolation

| Topic | Status | Notes |
| --- | --- | --- |
| Org-scoped lists | In progress | PRD §1 — view-all without org filter was a known gap |
| Encryption in transit | Shipped | HTTPS (TLS) |
| Encryption at rest | Provider | Appwrite Cloud / host defaults |

## Application security

| Topic | Status | Notes |
| --- | --- | --- |
| API permission coverage | In progress | PRD §2 — shrink unguarded route baseline |
| Audit log | Shipped with gaps | PRD §4 removes mock defaults in production |
| Penetration test | Not completed | Schedule before enterprise claims |

## Hosting and operations

- **Hosting:** Vercel (app) + Appwrite Cloud (data plane) unless customer-specific deployment.
- **Backups:** Follow Appwrite project backup policy; document RPO/RTO when ops runbook exists (CLM §14).
- **Incident response:** Use internal IT/on-call process; not published to customers yet.

## Known gaps (honest list)

1. Multi-tenant list isolation (PRD §1)  
2. Residual unguarded API routes (PRD §2)  
3. IT portal placeholders and mock metrics (PRD §5)  
4. Integrations UI vs wired SSO/API (PRD §6)  

## Certifications

- **SOC 2:** Not claimed.  
- **HIPAA / FedRAMP:** Not in scope unless contracted separately.

## Contact

Route procurement questions to sales + engineering lead; attach this doc and the Platform Readiness board status.
