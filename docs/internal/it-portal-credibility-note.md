# IT portal credibility (internal)

**Audience:** Product, sales eng, IT reviewers  
**Last updated:** 2026-10-04 (PRD section 5 — PR #184)

## What “credible” means here

The IT portal must not show invented CPU graphs or a wall of unfinished links that look like a finished ops product. Show real connectivity signals, honest **Not configured** empty states, or a visible **Preview** label on deep-linked shells.

## Section 5 delivery

### 5.1 IT dashboard API

`/api/it/dashboard` no longer returns hard-coded fake uptime, alerts, or request totals. It probes Appwrite reachability and reports this Next.js process (uptime + heap). Host CPU / fleet telemetry stays `telemetryConfigured: false` with a plain notice.

`/api/it/metrics/sse` emits `configured: false` (no random metrics).

### 5.2 Placeholder nav

**Placeholder count:** **30** routes still use `ITPlaceholderPage` (listed in `src/lib/it/placeholder-routes.ts`).

Primary IT nav (`filterITNavigationByPermissions`) **hides** those URLs. Deep links still work and show a **Preview** badge for internal QA.

### 5.3 Storage and monitoring

- `/api/it/storage-metrics` requires IT access, returns a local disk scan when directories exist, otherwise `configured: false` / **Not configured** (no mock MB numbers).
- Fake multi-OS “platform breakdown” estimates were removed.
- System health runs live connectivity checks and labels the page as connectivity-only.

## Roadmap link

**IT Development → Platform Readiness Roadmap**, section **IT portal credibility** (`?catalog=prd`).
