# Template: Roadmap batch PR (CLM / NPO / PRD)

---

**Batch:** [PR number / board section / link]

**Branch:** `cursor/[descriptive-name]-0e5f`

**Scope:** [bullet list of tasks in batch — nothing else]

**Agent workflow:**
1. `graft ask "[batch theme]" --source` for each major task.
2. Implement in order of dependency (schema → API → UI).
3. Commit and push before E2E; open draft PR early.
4. Green: `pnpm run test:api-authz`, `pnpm run build`, relevant `pnpm test:e2e` specs.

**RBAC / compliance:** Every new surface checks permissions from DB; update role_permissions via MCP if new permission keys.

**Demo DB:** After prod schema change: `node scripts/sync-demo-database-schema.mjs --apply` and confirm `Sync complete.`

**PR body:** Use repo PR template; include verify steps and any demo parity gaps.

**Done:** End with roadmap **user/developer journey** per `.cursor/rules/roadmap-pr-journey.mdc`.
