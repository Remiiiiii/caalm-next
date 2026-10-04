# Workspace data isolation (internal)

**Audience:** Sales, customer success, security reviewers  
**Last updated:** 2026-10-04 (draft — update when PRD section 1 merges)

## What we mean by “workspace”

A **workspace** is one customer organization in CAALM. Users belong to an org; contracts, licenses, files, and billing meters are meant to stay inside that org.

## What PRD section 1 proves in code

When section 1 tasks are complete and green in CI:

- List and count APIs for contracts, licenses, files, and invites apply an **org filter** even for roles that can “view all” inside their org.
- Automated tests seed **two orgs** in one database and assert cross-org reads fail.

## What still depends on deployment model

- **Single-tenant hosting** (one org per Appwrite database or dedicated project): isolation in app code plus separate databases is the strongest story.
- **Shared multi-tenant database:** section 1 is **required** before claiming true SaaS multi-tenancy; without it, view-all scopes were unsafe.

## What to tell buyers

- Say: “Data is scoped to your organization in the application layer; we run regression tests so one tenant cannot list another’s records.”
- Do **not** claim full SOC 2 or pen-test sign-off until those programs exist (see security questionnaire starter).

## Roadmap link

Track delivery on **IT Development → Platform Readiness Roadmap**, section **Workspace data isolation**.
