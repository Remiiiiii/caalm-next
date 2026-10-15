# Template: Appwrite schema migration

---

**Change:** [collection/table], [attributes/indexes]

**IDs:** Alphanumeric `$id` only; human name in `name` field. Update `.env.example` placeholders + `src/lib/appwrite/config.ts` fallback.

**Order:**
1. Apply change to the **production** Appwrite database (see `.cursor/rules/caalm-demo-database-sync.mdc` — never use the demo DB id here) via MCP.
2. `node scripts/sync-demo-database-schema.mjs --apply`
3. `node scripts/sync-demo-database-schema.mjs` — must show zero remaining diffs (except documented exceptions).

**Code:** Types, queries, and API routes updated in same PR.

**RBAC:** If new data is sensitive, wire permission checks before UI exposure.

**PR note:** Document any demo parity gap (e.g. Audit Logs attribute cap).
