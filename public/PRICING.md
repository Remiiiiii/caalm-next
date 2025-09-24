## CAALM Pricing (Starter • Pro • Enterprise)

This document proposes a 3‑tier pricing model tailored to the current product surface area, code structure, and the operational costs implied by the stack (Next.js + Appwrite + analytics, dashboards, reporting, and document/contract workflows).

### Why these tiers fit this product

- **Core value in code**: The codebase centers on compliance and contract analytics (`ExecutiveDashboard`, `AdministrationAnalytics`, `AnalyticsLayout`, `/api/analytics/[department]/*`, `ReportsPage`) with departments (Administration, Child Welfare, Behavioral Health, CFS, Residential, Clinic). This naturally segments usage by number of departments, contracts, users, and analytics features.
- **Cost drivers**: Appwrite database/storage, API usage, background video/media, analytics queries, and report generation. These scale with contracts, users, and departments.
- **Adoption curve**: Smaller orgs need a few departments and light analytics; mid‑size teams need more contracts, deeper analytics and automation; large orgs require SSO, compliance exports, auditability and SLAs.

All prices shown are Monthly and Yearly (Yearly saves 20%).

---

### Starter

- **Monthly**: $79
- **Yearly (20% off)**: $758 ($79 × 12 × 0.8)
- **Effective per user (at 10 users)**: $7.90/mo • $75.84/yr
- **Best for**: Small teams starting structured compliance, with a few departments and basic analytics.
- **Includes**:
  - Up to **3 departments**
  - Up to **10 staff users**
  - Up to **100 active contracts** tracked
  - **Analytics** for Admin + 2 departments
  - **Reports** (basic) via `ReportsPage`
  - **Email support**
  - **Analytical data retention**: 90 days
  - **Storage**: 5GB
  <!-- - **Rate limits** suitable for small teams (e.g., 15 requests/minute per workspace) -->

---

### Pro

- **Monthly**: $299
- **Yearly (20% off)**: $2,870 ($299 × 12 × 0.8)
- **Effective per user (at 100 users)**: $2.99/mo • $28.70/yr
- **Best for**: Multi‑department teams that need deeper analytics and operational reporting.
- **Includes everything in Starter, plus**:
  - Up to **6 departments**
  - Up to **100 staff users**
  - Up to **2,500 active contracts**
  - **Full analytics suite** across all departments
  - **Report scheduling**
  - **Webhooks/API access** for integrations
  - **Priority support**
  - **Storage**: 100GB
  <!-- - **Data retention**: 365 days -->

---

### Enterprise

- **Monthly**: $999
- **Yearly (20% off)**: $9,590 ($999 × 12 × 0.8)
- **Effective per user (at 1,000 users)**: ~$1.00/mo • $9.59/yr
- **Best for**: Organizations with advanced security, scale, and compliance/audit needs.
- **Includes everything in Pro, plus**:
  - **Unlimited departments**
  - **Up to 1,000 staff users** (higher limits upon request)
  - **25,000 active contracts** (higher upon request)
  - **SSO/SAML & SCIM** (enterprise identity)
  - **Advanced audit logs & exports**
  - **Custom roles & permissions**, detailed access
  - **Uptime SLA** 99.9% and **Dedicated CSM**
  - **Storage**: 1 TB (expandable)
  - **Custom integrations** and migration assistance

---

### Add‑ons (all tiers)

- **Additional users**: $3/user/month • $28.80/user/year (20% off)
- **Additional contracts**: $0.08/active contract/month beyond plan limit
- **Extra storage**: $10 per additional 100 GB/month
- **Priority support** (for Starter): +$199/month
- **Dedicated environment** (Pro+): from $499/month

---

### Rationale and mapping to code

- The analytics endpoints under `src/app/api/analytics/[department]/*` and components like `AdministrationAnalytics.tsx`, `AnalyticsLayout.tsx`, and the global `ExecutiveDashboard` showcase department‑scoped analytics. This is why **departments** are a primary pricing lever.
- `ReportsPage.tsx` and shared analytics UI imply ongoing compute/storage costs scaling with number of contracts and users, which supports **contract** and **user** limits by tier.
- The presence of Appwrite SDK use and document/contract entities suggests storage and query costs, hence included **storage caps** and add‑ons.
- Enterprise asks (SSO, audit exports, SLA) align with security/compliance expectations for larger orgs and the existing compliance theme.

---

### Implementation notes (UI)

- Add Monthly/Yearly toggle with a simple 20% discount if Yearly is selected.
- You can model plan constants like this (pseudocode):

```
const plans = {
  starter: { monthly: 79, yearly: 79 * 12 * 0.8 },
  pro: { monthly: 299, yearly: 299 * 12 * 0.8 },
  enterprise: { monthly: 999, yearly: 999 * 12 * 0.8 },
};
```

- Surface key limits (departments/users/contracts/storage) directly under each card in the pricing UI and gate features (SSO, audit logs export, SLA) based on tier.

---

### FAQs

- **What happens at overage?** We meter add‑ons monthly (users/contracts/storage). You can upgrade mid‑cycle; charges are prorated.
- **Can I mix monthly and yearly?** Per workspace, choose one billing cadence; you can switch at renewal.
- **Trials?** 14‑day Pro trial with reduced caps (e.g., 3 departments, 250 contracts, 10 users) is reasonable given current scaffolding.
