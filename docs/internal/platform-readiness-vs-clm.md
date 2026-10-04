# Platform Readiness vs CLM roadmap (decision context)

Two IT Development boards track overlapping **themes** but different **jobs**:

| Board | Catalog key | Primary job |
| --- | --- | --- |
| **CLM Completion Roadmap** | `clm` | Ship CLM product capabilities (templates, CRM, sign, APIs, SSO, packaging). |
| **Platform Readiness Roadmap** | `prd` | Close buyer-blocking gaps from the Oct 2026 assessment (tenant isolation, API authz, honest dashboards, IT portal truth, sales honesty). |

## Where they overlap

CLM **§1 Trust & Security** and **§2 Audit / mock removal** touch the same code areas as PRD **§1–§4** (isolation, route gates, 2FA, audit mocks, analytics honesty).

That overlap is intentional in the assessment, not a mistake in the catalog.

## Decision (2026-10-04)

**Option A is in effect.** CLM §1–2 are catalog pointers (`executionTrackedOn: prd`); implement on the Platform Readiness board only.

## Options (reference)

### A — PRD owns execution; CLM §1–2 become pointers (chosen)

- Do the work on **Platform Readiness** batch PRs (`PRD S{n} B{n}`).
- On the CLM board, mark or annotate §1–2 tasks as **tracked on PRD** (sourceRef or `linkedPrNumbers` empty + note in task description).
- **Pros:** One timeline for security/readiness; sales and IT have a single “are we safe to sell multi-tenant?” board.
- **Cons:** CLM section progress bars for §1–2 stay flat until you mirror completion or mark tasks cancelled/superseded.

### B — Dual track until PRD §1–5 are complete

- Keep both boards active; complete a theme on PRD first, then merge equivalent CLM tasks when the same PR lands (or close CLM tasks as duplicate in the merge PR body).
- **Pros:** CLM packaging narrative (“16 sections”) stays visually complete for internal planning.
- **Cons:** Two places to update; easy to mark the wrong catalog complete via title `1.1` if branch/title rules slip.

### C — Fold assessment into CLM only (not chosen)

- Would delete PRD as a separate board. You already chose **Platform Readiness** as its own catalog and Appwrite tables — so this path is closed unless you explicitly revert that decision.

## Hard rules either way

- PR titles: **`PRD 1.1`** or **`PRD S1 B1 …`** vs bare **`1.1`** on CLM — never mix without the prefix.
- Branches: `cursor/platform-readiness/s01-b1-5329` (batch) or legacy `cursor/platform-readiness/1-1.1-slug` (single-task match still works).
- Product features (customer API, webhooks, SSO **implementation**) stay on CLM **§11–12**; PRD **6.3** is handoff only after readiness sections 1–5 are done.

## Related internal docs

- `docs/internal/security-questionnaire-starter.md` — PRD task 6.2
- `docs/internal/buyer-demo-script.md` — PRD task 6.4
- `docs/internal/workspace-isolation-note.md` — PRD task 1.4
