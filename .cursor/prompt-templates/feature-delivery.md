# Template: Feature delivery (API + UI)

Copy into Agent chat and fill `[brackets]`.

---

**Goal:** [One sentence user outcome]

**Domain:** [contracts | licenses | tickets | rbac | settings | …]

**Permissions:** [PERMISSIONS.X.Y — must exist in DB for Super Admin if new]

**Context first:**
1. Run `graft ask "[goal + domain]" --source` and cite the top `covers:` spans you will edit.
2. List which `.cursor/rules/*.mdc` files apply.

**Constraints:**
- Multi-tenant: org/tenant id on all reads/writes.
- API: `pnpm new:api-route [path] --permission [PERMISSION] --methods [GET,POST,…]` unless extending an existing gated route.
- UI: every new/edited card or page content shell uses `glass-card` + `glass-card-cap` (never solid white `bg-white` card shells); data tables use Assign Tasks chrome (`CaalmDataTable` / `DATA_TABLE_*`, reference `TasksDataTable`); primary buttons `btn-primary`, deletes `delete-btn`; avatars photo-or-initials; dialog standards; `SearchField`, `PageIndex`, CAALM badges.
- Schema: if Appwrite attributes/collections change → sync demo DB in same PR.

**Acceptance:**
- [ ] Manual path: [route or click path]
- [ ] Tests: api-authz matrix if new route; vitest for pure logic; playwright if critical UI path
- [ ] No debug logs; no role-based bypasses

**Out of scope:** [what not to touch]
