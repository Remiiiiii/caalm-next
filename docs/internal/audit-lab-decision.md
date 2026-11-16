# Audit Lab and Production Tools (PTO) 16–19

Audit Lab is the **Schedule Review** product: mock-audit sessions, interview prep, a PBC-style evidence matrix, and practice drills. Ask CAALM tools for those actions live on the Production Tools board as **sections 16–19** (gap lists P–S), not in PTO section 11 (tickets/IT).

## Two PR families

1. **Product** — `src/lib/audit-lab/`, `/audit-lab`, `/api/audit-lab/*`, permissions `audit_lab.*`.
2. **PTO wrappers** — `src/lib/assistant/tools/auditLabTools.ts` on branches `cursor/production-tools/s16-b1-5329` … `s19-b2-5329`.

PTO **16+ stays locked** until section **15** is fully merged. Product PRs may merge earlier.

## Waves

| Wave | Product | PTO |
|------|---------|-----|
| 0 | Permissions, schema, `/audit-lab` shell, Schedule pill | Catalog 16–19 |
| 1 | Sessions | s16-b1 |
| 2 | Interview | s17-b1 |
| 3 | Evidence | s18-b1 |
| 4 | Practice + reports | s19-b1, s19-b2 |

Tools wrap `src/lib/audit-lab/service.ts`. Do not add a second workflow engine for roleplay.

## Product UI (functionality spec)

Six surfaces under `/audit-lab/*`: overview, sessions, interview, practice, evidence, reports. Left nav mirrors Contract Preview section nav (desktop-first).

### §1 capability map (permissions only)

| Spec intent | Permission keys |
|-------------|-----------------|
| View dashboards / deep links | `audit_lab.view` |
| Create sessions, scripts, invites | `audit_lab.manage_sessions` |
| Evidence assign + status (dept) | `audit_lab.manage_evidence` |
| Compliance coordinator / accept | `audit_lab.coordinate_evidence` |
| Practice drills | `audit_lab.run_practice` |
| Score attempts (auditor) | `audit_lab.score_practice` |
| Publish / export reports | `audit_lab.publish_reports` |

Resolved in `src/lib/audit-lab/access.ts` (`resolveLabCapabilities`). IT staff keep view-only via role_permissions seed; department scoping hooks in `sessionInScope` when dept names are supplied.

### Crons

- `/api/cron/audit-lab-reminders` — session invitation + reminder pass (`CRON_SECRET`, `orgId` query).
- `/api/cron/audit-lab-chasers` — overdue evidence nudges.

### Spec polish (UI)

- Interview: drag questions into Opening / Process / Evidence / Closing; version conflict on save; presence heartbeat.
- Evidence: coverage bar chart, group-by + status filters, single-person flag in table.
- Practice: persona picker, show-me 2-minute timer, four score dimensions, observer cannot score.
- Reports: readiness vs practice trend chart + CSV export at `/api/audit-lab/reports/export`.
- Capabilities poll every 30s so mid-session permission loss drops actions without a hard error.
- Evidence status §10 enums in app code (`normalizeEvidenceStatus`); migrate legacy rows with `node scripts/migrate-audit-lab-evidence-status.mjs --apply`.
- LLM auditor persona (spec 4b) still deferred — template/follow-up path only until product enables Anthropic for drills.
