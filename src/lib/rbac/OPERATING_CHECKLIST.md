# RBAC operating checklist

Use this when changing roles, dashboards, permissions, or Appwrite data that RBAC reads.

## Optional `roles` columns (`priority`, `homeDashboardPath`)

**You do not need an admin dashboard for these to work.** The app already reads them from Appwrite when present and falls back to `role-dashboard-metadata.ts` when they are missing. You can set values via:

- Appwrite Console (edit `roles` rows), and/or
- `scripts/backfill-role-dashboard-metadata.ts` after adding the attributes.

An admin UI is optional: it only helps non-technical operators avoid the Console or scripts.

---

## One-time / infra

- [ ] Appwrite `roles` table has optional `priority` and `homeDashboardPath` when you want DB-driven home routing (otherwise the fallback map applies).
- [ ] Run `pnpm tsx scripts/backfill-role-dashboard-metadata.ts` after adding those columns (correct env: endpoint, project, database, server key).
- [ ] CI: set `PLAYWRIGHT_E2E_USER_ID` and ensure the E2E user can resolve via your auth path and reach `/dashboard`.

## When you add a role or dashboard

- [ ] Add/update `DASHBOARD_ROUTE_POLICY` in `dashboard-access-policy.ts` (permissions, `allowedRoleIds`, prefix order).
- [ ] Add/update `ROLE_DASHBOARD_FALLBACK` in `role-dashboard-metadata.ts` if the role is new or the home path changes.
- [ ] Update `ROLE_PRIORITY_ORDER` / role-priority behavior in `role-priority.ts` if naming or precedence changes.
- [ ] Sync Sidebar `roleToDashboardMap` (and any nav URLs in `constants`) if users need a new shortcut.
- [ ] If the role should own a new route: guard the page with `requireDashboardPathAccess` from `page-guards.ts` (wraps `getUnauthorizedDashboardRedirect`, same rules as proxy).

## When you change permissions

- [ ] Map new capabilities in `constants/permissions` and wire `role_permissions` in Appwrite.
- [ ] Use `requirePermission` / `hasPermission` on new APIs; for contracts use `requireContractPermission` and align with `getContractListScope` if lists are affected.
- [ ] Platform / break-glass keys live under `PERMISSIONS.PLATFORM` (diagnose, manage_schema, force_delete, view_all_orgs, system_settings, elevate). Gate Super-Admin-only nav (e.g. System Settings) with `PLATFORM.SYSTEM_SETTINGS`, not role name alone.
- [ ] Invalidate or wait out RBAC cache after bulk permission changes (`CacheManager.invalidateRBAC` is used on role assignment APIs).

## Role create / update (SoD)

- [ ] Role create and update APIs enforce separation of duties via `sod-rules.ts` / `separation-of-duties.ts` (block conflicting permission sets on custom roles).
- [ ] Prefer job-shaped starters from `constants/role-templates.ts` instead of blank 70+ permission walls.

## Role assignment (ops / admin APIs)

- [ ] Assign roles only through supported admin flows (`/api/admin/...`) so SoD checks and audit events run.
- [ ] Multi-role assign API (`/api/admin/users/[userId]/roles`): body may use `roleId` + `action` (legacy) or `roleIds` + `mode`; modes are `replace` | `add` | `remove` (default `replace`).
- [ ] If assignment fails with SoD: split duties across roles/users per `separation-of-duties.ts`.
- [ ] Confirm audit logs show `rbac_user_role_assigned` / `rbac_user_role_set_by_email` for changes you care about.

## Page guards

- [ ] Dashboard / settings server pages use `requireDashboardPathAccess` / `requirePagePermission` from `page-guards.ts` instead of hand-rolled permission checks.

## URLs and legacy links

- [ ] Bookmarks should use `/dashboard` (canonical); `/dashboard/executive` redirects to `/dashboard`.
- [ ] Docs and emails: no hard-coded `/dashboard/executive`.

## Data access (contracts)

- [ ] Users have org context; contract list APIs scope by `data-scope.ts` (org / department / own) — verify department fields on users/contracts match expectations.
- [ ] Cache keys for contract lists are scope-aware; after permission changes, expect different cache segments per user.

## API authz CI matrix

- [ ] New `src/app/api/**/route.ts` handlers must use `requirePermission`, session auth, cron secret, or webhook verification — or an intentional allowlist entry in `api-authz-allowlist.ts` with a reason.
- [ ] Prefer scaffolding: `pnpm new:api-route <path> --permission CONTRACTS.VIEW` (see `.cursor/rules/api-route-authz.mdc`).
- [ ] CI job **API authz matrix** (`pnpm run test:api-authz`) fails if the unguarded set grows vs `api-authz-baseline.json`.
- [ ] When you lock down a grandfathered route, re-run `pnpm run api-authz:baseline` so the baseline shrinks (ratchet only goes one way in reviews).
- [ ] Do not regenerate the baseline to hide new gaps — fix or allowlist with a written reason.

## Verification

- [ ] Run unit tests: `pnpm exec vitest run tests/rbac/` (includes API authz matrix).
- [ ] Smoke: sign in as each role, hit `/dashboard`, confirm redirect to the right home; try a forbidden path and confirm redirect to home, not a blank page.
