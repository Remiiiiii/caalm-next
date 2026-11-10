# Production Tools Roadmap — handoff for Claude

## What it is

**PTO (Production Tools)** is the fourth IT Development board (`?catalog=pto`). It turns the **Ask CAALM assistant tool gap list (A–O)** into tracked work: each task = **one permission-gated chat tool** (or a tight group), shipped as **small batch PRs** instead of one mega-PR.

- UI: `/dashboard/it/development/production-tools-roadmap`
- API: `/api/roadmap/overview?catalog=pto`
- Same engine as CLM / Nonprofit / Platform Readiness: sequential unlock, progress, merge + green CI marks complete.

## Core product rules (every tool)

1. Register in Ask CAALM tool registry with `requiredPermissions` from the DB — **no role-name bypass**.
2. **Mutating** tools: confirm before write + audit who/what/when/tenant on success.
3. **Reads**: org-scoped; clear deny / empty messages.
4. **2a rule**: wrap existing product APIs. If no backend yet → honest permission-gated “not available yet”; leave task incomplete.
5. AI document extraction stays human-in-the-loop (no auto-save).
6. **Never** expose platform force-delete, manage-schema, or API-key tools to chat (esp. section 11).

## How work ships

- Batches: up to **5 task codes** per PR (`pto-pr-batches.ts`).
- Branch: `cursor/production-tools/s{nn}-b{n}-5329`
- Title: `PTO S{n} B{n} {section} ({range})`
- Body: `buildPtoBatchPrBody` from catalog Who/What/Where/Why/When/How + Done when.
- Set `linkedPrNumber`; **do not merge** — user inspects/merges.
- Tests: `tests/roadmap/pto/{code-with-dashes}.test.ts` + `pnpm run test:api-authz` when routes/permissions change.

## Sections (0 seed-complete; product starts at 1)

| # | Theme | Example tools |
|---|--------|----------------|
| 0 | Roadmap engine (seeded done) | catalog, locking, board page, PR matching, conventions |
| 1 | Users / org admin | invite_user, list_users, assign roles, deactivate, org settings — **PRs #219, #223 linked** |
| 2 | Contracts CLM depth | get/ask/create/update/bulk, extract/summarize/compare, obligations, signature, renew, export |
| 3 | Licenses | get/create/renew/approve/extract, expirations, assign owner |
| 4 | Approvals write | get / approve / reassign / override |
| 5 | Clauses & templates | search/create/insert, templates, seed from doc |
| 6 | Audits CAPA | findings, CAP create/assign/evidence, readiness, export |
| 7 | Funding & proposals | search funding, obligations, create proposal, link contract |
| 8 | Constituents / gifts / donations / volunteers | search, gift, donation page, volunteer, suggested ask |
| 9 | Calendar / events | invite attendees, approve request, share, public event |
| 10 | Tasks | update/list/create-for-finding/cancel |
| 11 | Tickets & IT (safe) | create/assign ticket, runbooks, system health |
| 12 | Integrations & mail | Gmail/Outlook send, status, calendar sync, CRM draft |
| 13 | News / briefing / notifications | morning briefing, list notifications, SMS test |
| 14 | Analytics & exports | risk averted query, CSV export, schedule report |
| 15 | Agent OS cross-cutting | preview mutation, undo, explain deny, list capabilities, multi-step compose |

## Key files

- Catalog: `src/lib/roadmap/production-tools-catalog.ts`
- Batches: `src/lib/roadmap/production-tools/pto-pr-batches.ts`
- PR body: `src/lib/roadmap/production-tools/pto-batch-pr-body.ts`
- Batch markers: `src/lib/roadmap/pto-batches/`
- Rule: `.cursor/rules/production-tools-roadmap-prs.mdc`

## Progress note for continuation

Section **0** is seed-complete. Section **1** has linked PRs **#219** (1.1–1.5) and **#223** (1.6–1.8). Section **2 batch 1** shipped on **#227** (placeholder **#226**). Sections **2–15** remaining batches have **draft stub PRs #229–#247** (see `pr-catalog-bodies/pto/linked-pr-numbers.json` and `pto-pr-batches.ts` `linkedPrNumber` fields). Implement on the matching `cursor/production-tools/sNN-bN-5329` branch; full PR bodies in `pr-catalog-bodies/pto/*.md` or `pnpm pto:batch-pr-body --pr <n>`.
