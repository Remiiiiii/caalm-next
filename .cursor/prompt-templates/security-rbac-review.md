# Template: Security / RBAC review (pre-merge)

Use before merging auth, navigation, or data-access changes.

---

**Change summary:** [files and behavior]

**Threat focus:**
- Cross-tenant data leak (missing org filter)
- Privilege escalation (new route without `requirePermission`)
- Role bypass (`if super admin`) — **forbidden**
- IDOR on document/file IDs
- Cron/webhook routes missing secret gates

**Evidence required:**
- Point to `requirePermission` or approved alternate in each new/changed `route.ts`
- Point to UI visibility checks using permission arrays, not role names
- `pnpm run test:api-authz` output clean
- If permissions added: confirm Super Admin + Org Admin assignments in Appwrite (MCP)

**Optional:** Run thermos / security-review subagent on branch diff.

**Verdict:** [ APPROVE | BLOCK — list fixes ]
