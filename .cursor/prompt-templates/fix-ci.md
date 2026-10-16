# Template: Fix CI / failing checks

Copy into Agent chat and fill `[brackets]`.

---

**PR / branch:** [PR number or branch name]

**Failing check(s):** [exact job/check names]

**Failure snippet:** [first actionable error line(s) — or “see CI logs”]

**Context first:**
1. Read the failing check log (GitHub MCP / `gh` / CI investigator) before editing.
2. Reproduce locally when practical: `[command e.g. pnpm run test:api-authz | pnpm run build | pnpm test:e2e …]`.

**Constraints:**
- Fix the **cause** — do not disable gates, skip hooks, or set `continue-on-error` to hide failures.
- Prefer minimal diff; match existing CI patterns (`fix-ci` / team-kit mindset).
- If flake: isolate and stabilize; do not “retry until green” as the fix.

**Acceptance:**
- [ ] Same check(s) pass locally or on the PR
- [ ] No unrelated refactors in the CI fix commit
- [ ] If test was wrong, fix the test **and** confirm product behavior is still correct

**Out of scope:** [e.g. unrelated lint debt, other PRs]
