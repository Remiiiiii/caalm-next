# Honest dashboards and compliance views (internal)

**Audience:** Product, sales eng, security reviewers  
**Last updated:** 2026-10-04 (PRD section 4 — PR #181)

## What “honest” means here

Dashboards must not present invented numbers as live org data. Either the chart is wired to a real API (application programming interface) query, or it is clearly labeled **Sample data** / **DEMO**.

## Section 4 delivery

### 4.1 Audit mock flag

`NEXT_PUBLIC_AUDIT_MOCK_DATA` defaults **off** outside development:

| Context | Default |
|---------|---------|
| `NODE_ENV=production` (unset env) | mock **off** |
| `NODE_ENV=development` (unset env) | mock **on** (local demos) |
| `APP_MODE=demo` | mock **on** |
| Explicit `true` / `false` | wins |

When mock is on, the compliance status page shows a **DEMO** badge.

### 4.2 Widget inventory

`src/lib/analytics/widget-inventory.ts` lists each analytics surface as `live`, `sample`, or `mixed`. CI asserts no silent sample widgets on executive / organization dashboards.

### 4.3 Unified analytics

`/api/analytics/unified` requires permission and org scope (from section 2). Customer UI may call it; unauthenticated / unauthorized callers get 401/403.

### 4.4 Compliance tab honesty

Audit domain tabs and the analytics compliance tab show a plain banner when illustrative data is in play. Live audit log pages are unchanged.

## Roadmap link

**IT Development → Platform Readiness Roadmap**, section **Honest dashboards and compliance views** (`?catalog=prd`).
