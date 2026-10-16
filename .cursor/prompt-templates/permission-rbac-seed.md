# Template: New permission / RBAC seed

Copy into Agent chat and fill `[brackets]`.

---

**Permission key(s):** [e.g. PERMISSIONS.LICENSES.EXPORT — exact string(s)]

**Used by:** [routes / nav / buttons that will check this permission]

**Roles that must receive it:** [at minimum Super Admin + Organization Admin; list any others]

**Context first:**
1. Run `graft ask "PERMISSIONS [domain] requirePermission" --source`.
2. Follow `.cursor/rules/security-rbac.mdc` — permissions from DB only; **no** role-name bypasses.

**Order:**
1. Add permission document(s) in **production** Appwrite (MCP) if they do not exist.
2. Assign to required roles via `role_permissions` in production.
3. **Seed the same permission + role_permission rows into caalm-demo** (schema sync alone is not enough).
4. Wire code checks (`requirePermission` / UI permission arrays) in the same PR.

**Acceptance:**
- [ ] Code checks the new permission key(s), not role names
- [ ] Super Admin and Org Admin have the permission in prod **and** demo
- [ ] `pnpm run test:api-authz` covers new/changed routes
- [ ] Demo login with a seeded admin can exercise the gated surface

**Out of scope:** [unrelated RBAC redesign]
