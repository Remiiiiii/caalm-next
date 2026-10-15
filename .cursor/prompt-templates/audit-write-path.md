# Template: Audit write path

Copy into Agent chat and fill `[brackets]`.

---

**Action being audited:** [e.g. license status change, contract reassign, permission grant]

**Who:** [actor fields — user id / email pattern already used in product]

**What:** [human-readable change summary + structured fields]

**When:** [timestamp source — server time]

**Tenant:** [org / tenant id field — required on every audit row]

**Write path:** [API route or service function that performs the mutation]

**Context first:**
1. Run `graft ask "audit log [domain] write" --source` and match existing audit helpers.
2. Do not invent a parallel logging style if a domain helper already exists.

**Constraints:**
- Audit on **successful** material writes (create / update / delete / status change).
- Include tenant (org) id — no cross-tenant ambiguity.
- Prefer existing Audit Logs patterns; note demo attribute-cap gaps if schema changes.
- Schema change → prod then `node scripts/sync-demo-database-schema.mjs --apply`.

**Acceptance:**
- [ ] Performing the action creates an audit entry with who / what / when / tenant
- [ ] Entry is visible in the product audit UI (or documented API) for that org
- [ ] Failed unauthorized attempts do not write a fake “success” audit

**Out of scope:** [full SOC 2 paperwork, unrelated analytics]
