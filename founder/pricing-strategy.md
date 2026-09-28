<!-- founder:pricing-strategy · 2026-09-28 · input: CAALM Starter $79 Growth $449 hybrid CLM + shipped nonprofit CRM -->

# CAALM pricing strategy (workshop output)

Assumption: primary buyer remains compliance/contracts-first; nonprofit CRM is expansion and hybrid differentiator, not a separate SKU yet.

## 1. Pricing model analysis

| Model | Fit | Notes |
|-------|-----|-------|
| Flat subscription (per workspace) | **5** | Matches `public/PRICING.md`, Stripe caps, and buyer mental model for "one org." |
| Usage-based | 2 | No meters for gifts/constituents; only AI extractions and storage add-ons. |
| Per-seat | 3 | Partial via user cap + $3/user add-on; not the headline price. |
| Freemium | 1 | Conflicts with compliance positioning and pilot discipline. |
| Credits (AI extractions) | 4 | Already capped (50 / 500 / pilot 100); could extend later for fundraising AI. |
| One-time | 1 | Wrong for lifecycle product. |

**Recommendation:** Keep **per workspace** as primary. Plan a **future optional meter** (constituent rows or posted gifts/month) only after code enforces it; do not advertise until then.

## 2. Tier design

### Starter — $79/mo ($758/yr)

**For:** Small org, ≤3 departments, ≤100 contracts/licenses, light AI intake.

**Shipped hooks:** Contract & license intake, approvals, renewals, custom roles, basic dashboards, email support, **full nonprofit CRM routes** at same workspace (constituents, gifts, campaigns, volunteers, fund/990 worksheet settings) via permissions.

**Upgrade triggers:** 11th user, 101st contract or license, HubSpot origin, department dashboards, 51st AI extraction/month, 10 GB storage.

**Packaging fix:** Add bullet: "Constituent CRM, gifts, and volunteers (permission-based)" so Starter is not misread as CLM-only.

### Growth — $449/mo ($4,310/yr)

**For:** Multi-department operations, high contract volume, license portfolio at scale, HubSpot → contract draft.

**Adds vs Starter:** 100 users, 6 departments, 2,500 contracts, unlimited licenses, 500 AI extractions, 100 GB, HubSpot CRM origin, license allocate/renew, priority email, **90-day pilot** (AI 100/mo during trial).

**Hybrid story:** Default tier for **grants + donors + contracts** in one workspace without claiming finance system replacement.

**Packaging fix:** Lead Growth card with "Operations + development team" for FQHC / human services ICP.

### Enterprise — custom

Sales-led; Salesforce origin, custom limits, security questionnaire. SSO/API/SLA only via custom agreement when shipped.

## 3. Competitive context (checked 2026-09-28)

| Competitor | Public anchor | Source | vs CAALM |
|------------|---------------|--------|----------|
| Bloomerang CRM | From **$125/mo** (annual billing); modules stack (Fundraising $40, Volunteer $119 cited on third-party summaries) | https://bloomerang.com/pricing | Starter **below** CRM-only entry; Growth **between** modular stack and full platform quotes |
| Bloomerang Giving Platform | From **$242/mo** (site); bundle estimates higher on aggregators | https://bloomerang.com/ | Growth under full-suite list; hybrid value is CLM + CRM |
| Ironclad CLM | **No list price**; review sites cite ~**$500/mo** entry; enterprise **$25k–$75k+/yr** common (Estimate from aggregators) | e.g. https://signeasy.com/blog/business/ironclad-pricing (third-party) | Starter/Growth **far below** enterprise CLM; compare on mid-market ops, not Ironclad seat |

CAALM should **not** price like Ironclad or full Bloomerang suite unless sales moves upmarket; **should** price above "spreadsheet + Drive" for hybrid compliance + CRM.

## 4. Unit economics (Estimates)

- **AI extractions:** Growth at 500/mo vs Starter 50/mo dominates variable cost; pilot cap at 100 protects trial COGS. Estimate: marginal cost per extraction depends on model; keep pilot cap until conversion metrics stable.
- **Support:** Starter email vs Growth priority; nonprofit CRM increases ticket surface on Growth without extra SKU. Estimate: support minutes/user higher on Growth; margin still OK if churn low.
- **Break-even customers:** Estimate: depends on fixed eng/infra; at $449/mo, ~23 Growth customers ≈ $10k MRR before add-ons (arithmetic only, not company burn).

Mark all infra/support dollars as **Estimate** until finance model is pasted into `founder/facts.md`.

## 5. Pricing psychology

- **Anchor:** Growth at $449 makes Starter look accessible; Enterprise custom anchors top.
- **Decoy:** Starter license cap (100) pushes license-heavy orgs to Growth before user cap bites.
- **Annual:** 20% off; frame as "~2 months free" on Growth ($4,310/yr vs $5,388 list monthly sum).

## 6. Launch vs scale

- **Keep** 90-day Growth pilot; it is the honest "try hybrid" path.
- **Next 90 days (packaging, not price):** Update `public/PRICING.md` and landing with nonprofit shipped list + refusals (payroll, e-file, GL, wealth engine).
- **Price change triggers:** Sustained >80% Growth attach on nonprofit-led deals; or AI COGS >X% of ARPU. Until then, hold **$79 / $449**.
- **Grandfathering:** Existing workspaces keep tier limits at signup; document in billing FAQ when limits change.

## Refusals (do not add to cards)

990 e-file, payroll, general ledger, live Intacct/QBO sync, wealth engine, SSO/API/webhooks/SLA on self-serve tiers, roadmap-only features.

---

**Saved:** `founder/pricing-strategy.md`  
**Next:** Edit `public/PRICING.md` to match; optional `sales-create-an-asset` for nonprofit landing copy.
