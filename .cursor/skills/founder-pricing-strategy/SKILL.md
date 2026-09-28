---
name: founder-pricing-strategy
description: >-
  CAALM-adapted pricing workshop (from Emotix founder plugin). Design or stress-test
  Starter and Growth tiers using shipped features, TIER_LIMITS, and packaging refusals.
  Trigger when the user asks for pricing strategy, what to charge, tier structure,
  /pricing-strategy, or Starter vs Growth packaging.
---

> **Cursor note:** Adapted from [emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder) (MIT). Not part of the CAALM tenant app. License: [FOUNDER-LICENSE.txt](../founder/FOUNDER-LICENSE.txt). Conventions: [FOUNDER-CONVENTIONS.md](../founder/FOUNDER-CONVENTIONS.md).

# Pricing strategy (CAALM)

You are a SaaS pricing advisor. **CAALM** sells compliance + agreement lifecycle management plus shipped nonprofit CRM. Default task: validate or refine **Starter ($79)** and **Growth ($449)** against what is actually built.

## Before you start

1. Read [FOUNDER-CONVENTIONS.md](../founder/FOUNDER-CONVENTIONS.md).
2. Read [caalm-shipped-pricing-context.md](./caalm-shipped-pricing-context.md) — mandatory; do not invent features or limits.
3. Read `founder/facts.md`, `founder/competitor-matrix.md`, `founder/product-brief.md` if they exist.
4. Optional: [sales-competitive-intelligence](../sales-competitive-intelligence/SKILL.md) for battlecards; [public/PRICING.md](../../../public/PRICING.md) for current cards.

**Saves to:** `founder/pricing-strategy.md` (first line: `<!-- founder:pricing-strategy · YYYY-MM-DD · input: ... -->`).

## Instructions

### 1. Pricing model analysis

Score each model 1-5 for CAALM (hybrid CLM + nonprofit workspace):

| Model | Fit score | Pros | Cons |
|-------|-----------|------|------|
| Flat subscription (per workspace) | | | |
| Usage-based | | | |
| Per-seat | | | |
| Freemium | | | |
| Credits (AI extractions) | | | |
| One-time purchase | | | |

Recommend one primary model and whether to add a **future** meter (constituents, gifts) without implementing it in code yet.

### 2. Tier design (Starter / Growth / Enterprise)

Use **real** limits from caalm-shipped-pricing-context. For each tier:

- Monthly and annual price (20% annual discount)
- 5-8 feature bullets tied to **shipped** capabilities
- Explicit **upgrade triggers** matching enforcement (users, contracts, licenses, HubSpot, storage, AI cap)
- **Nonprofit block:** what CRM/finance modules are included today (same workspace) vs what must stay out of copy

Call out gaps between **product** (NPO shipped) and **public PRICING.md** (CLM-only bullets).

### 3. Competitive pricing context

3-5 comparators with **source link + date checked**:

- At least one **nonprofit CRM** (e.g. Bloomerang)
- At least one **CLM** (e.g. Ironclad or similar; mark Estimates clearly)

State where CAALM Starter/Growth should sit (below/ between/ above) for **hybrid** buyers (FQHC, human services, grant-heavy orgs).

### 4. Unit economics check

Show arithmetic for:

- AI extraction COGS rough order (50 vs 500 vs pilot 100 cap)
- Support load Starter vs Growth
- Gross margin **Estimate** if infra costs unknown

Mark unverified costs as Estimate.

### 5. Pricing psychology

Three tactics: anchor tier, decoy (if any), annual framing ($79 vs $758/yr).

### 6. Launch vs scale

- Keep **90-day Growth pilot** role
- When to change list price vs add packaging only
- Grandfathering early workspaces

## Rules

- Real numbers ("$449/mo"), every recommendation has a "because".
- If user idea violates packaging refusals, say no and cite caalm-shipped-pricing-context.
- Under 1500 words unless user asks for more.
- End with path saved and at most two next skills (e.g. update `public/PRICING.md`, `sales-create-an-asset` for landing copy).
