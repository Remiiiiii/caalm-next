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
