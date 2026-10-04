# Workspace data isolation (internal)

**Audience:** Sales, customer success, security reviewers  
**Last updated:** 2026-10-04 (PRD section 1 — PR #180)

## What we mean by “workspace”

A **workspace** is one customer organization in CAALM. Users belong to an org; contracts, licenses, files, invites, and billing meters are meant to stay inside that org.

## What PRD section 1 proves in code

When section 1 tasks are complete and green in CI:

- Contract list scopes (including “view all” inside an org) always include `Query.equal("orgId", …)`.
- License detail by id returns **404** when the row belongs to another org.
- Dashboard file and invitation list routes require auth, check org membership, and filter by `orgId`.
- Usage meters (`planLimits`) already count by `orgId` only.
- Automated tests seed **two orgs** in one database and fail CI if `all_org` ever drops the org filter.

## What still depends on deployment model

- **Single-tenant hosting** (one org per Appwrite database or dedicated project): isolation in app code plus separate databases is the strongest story.
- **Shared multi-tenant database:** section 1 is **required** before claiming true SaaS multi-tenancy; without it, view-all list scopes were unsafe.

## What to tell buyers

- Say: “Data is scoped to your organization in the application layer; we run regression tests so one tenant cannot list another’s records.”
- Do **not** claim full SOC 2 or pen-test sign-off until those programs exist (see `docs/internal/security-questionnaire-starter.md`).

## Roadmap link

Track delivery on **IT Development → Platform Readiness Roadmap**, section **Workspace data isolation** (`?catalog=prd`).
