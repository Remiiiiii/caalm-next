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
- [ ] If the role should own a new route: add a server page guard with `getUnauthorizedDashboardRedirect` (same rules as proxy).

## When you change permissions

- [ ] Map new capabilities in `constants/permissions` and wire `role_permissions` in Appwrite.
- [ ] Use `requirePermission` / `hasPermission` on new APIs; for contracts use `requireContractPermission` and align with `getContractListScope` if lists are affected.
- [ ] Invalidate or wait out RBAC cache after bulk permission changes (`CacheManager.invalidateRBAC` is used on role assignment APIs).

## Role assignment (ops / admin APIs)

- [ ] Assign roles only through supported admin flows (`/api/admin/...`) so SoD checks and audit events run.
- [ ] If assignment fails with SoD: split duties across roles/users per `separation-of-duties.ts`.
- [ ] Confirm audit logs show `rbac_user_role_assigned` / `rbac_user_role_set_by_email` for changes you care about.

## URLs and legacy links

- [ ] Bookmarks should use `/dashboard` (canonical); `/dashboard/executive` redirects to `/dashboard`.
- [ ] Docs and emails: no hard-coded `/dashboard/executive`.

## Data access (contracts)

- [ ] Users have org context; contract list APIs scope by `data-scope.ts` (org / department / own) — verify department fields on users/contracts match expectations.
- [ ] Cache keys for contract lists are scope-aware; after permission changes, expect different cache segments per user.

## Verification

- [ ] Run unit tests: `tests/rbac/dashboard-access-policy.test.ts` (and full `pnpm test` as you normally do).
- [ ] Smoke: sign in as each role, hit `/dashboard`, confirm redirect to the right home; try a forbidden path and confirm redirect to home, not a blank page.
