# API permission coverage (internal)

**Audience:** Engineering, security reviewers  
**Last updated:** 2026-10-04 (PRD section 2 — PR #182)

## What we mean by “permission coverage”

Every `src/app/api/**/route.ts` handler should either:

1. Call a detectable auth gate (`requirePermission`, `requireAssistantAccess`, `requireAuthAndOwner`, session helpers, cron secret, or webhook verify), or
2. Sit on the intentional allowlist with a written reason, or
3. Appear on the grandfathered **baseline** list (temporary debt).

## Baseline ratchet (PRD 2.5)

| Metric | Before section 2 | After PR #182 |
|--------|------------------|---------------|
| Unguarded baseline routes | 119 | 65 |
| Delta | — | **−54** |

CI command: `pnpm test:api-authz`

- **Must not grow:** new unguarded routes fail CI unless intentionally reviewed and the baseline is regenerated.
- **May shrink:** regenerating after real gates land is the happy path (`pnpm run api-authz:baseline`).

## What section 2 gated

- **Files (2.1):** upload, download, get-by-ids, and platform deletion/migrate helpers.
- **Analytics (2.2):** unified (permission + org-scoped contracts), calendar, admin, department routes, search analytics.
- **Assistant / AI (2.3):** scanner now detects `requireAssistantAccess`; legacy `ai-analyze`, `ai-contract-type-suggest`, and `extract-pdf-text` use `requirePermission`.
- **Duplicates (2.4):** `contracts/extract-data`, draft helpers, and `v1/contracts/*` stragglers gated or cron-secret protected; UI already prefers non-`v1` paths.

## Scanner signals added

`requireAssistantAccess`, `requireAuthAndOwner`, and `getCurrentUserId` now count as real gates so correct code is not false-flagged as unguarded.

## Roadmap link

Track delivery on **IT Development → Platform Readiness Roadmap**, section **API permission coverage** (`?catalog=prd`).
