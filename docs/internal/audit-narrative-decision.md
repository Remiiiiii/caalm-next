# Decision: audit log is a product promise

**Status:** Accepted  
**Date:** 2026-10-16  
**Audience:** Engineering, product, Cursor agents  

## Decision

For **material writes** (create / update / delete / status change / approval decision / export of sensitive data), CAALM must leave an **audit story** a buyer can read later:

| Question | Field / habit |
|----------|----------------|
| **Who?** | `user_id`, `user_name`, `user_email` |
| **What?** | `summary` or clear `event_title` + `action`; `changes` when fields move |
| **When?** | Server timestamp on the audit row |
| **Which customer?** | `orgId` (tenant) — required; never leave it ambiguous |
| **Which record?** | `target_type`, `target_id`, `target_label` when known |

Use the existing helper: `logAuditEvent` in `src/lib/services/audit-logger.ts` (and domain wrappers that call it). Prefer template `.cursor/prompt-templates/audit-write-path.md` when planning a new write path.

## What we are not doing yet

- Rewriting every historical write path in one PR  
- A second “audit product” or external SIEM (unless a signed customer requires it)  
- Fake “success” audits for failed/unauthorized attempts  

## Hard rules for agents

1. New or changed material mutations → audit entry with who / what / when / tenant.  
2. Do not invent a parallel logger if `logAuditEvent` (or a domain helper) already fits.  
3. Schema changes to Audit Logs: prod first, then demo sync; note demo attribute-cap limits on `changes` if they bite.  
4. Point product/security questions here and to rule `audit-narrative.mdc`.

## Why

Enterprise buyers treat “show me who changed that contract” as seriously as the feature itself. Weak audit stories lose deals and weaken SOC 2–style change evidence.

## Related

- Playbook Top 10 #7 and overlooking “audit log as product”  
- UI: audit log screens under the app’s Audits area  
- Agent rule: `.cursor/rules/audit-narrative.mdc`  
