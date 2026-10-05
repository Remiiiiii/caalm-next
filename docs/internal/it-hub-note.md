# Multi-tenant IT hub (internal)

**Audience:** Product, sales eng, platform operators, customer IT  
**Last updated:** 2026-10-04

## What this is

`/dashboard/it` is a **control plane** for CAALM, not a fake observability suite.

- **Customer IT** sees only their organization: seats, storage, tickets, audit snippets, plan/billing posture, integrations.
- **Platform operators** with `platform.view_all_orgs` **and** `it.view_monitoring` (assigned in the database) get a **Tenants** fleet and can inspect any org. That is **read-only tenant inspection**, not “View as user” impersonation.

Host CPU / request graphs stay **Not configured** until a real telemetry backend exists.

## How to open it

1. Sign in as IT staff (IT department + an IT permission).
2. Open `/dashboard/it`.
3. Customer IT: org cards load for your membership org. There is no tenant switcher.
4. Platform: use **Tenants** in the IT sidebar, or the switcher, to pick an organization. A banner says you are viewing that tenant.

IT hub org selection uses `sessionStorage` key `caalm_it_hub_org_id`. It does **not** change `caalm_org_id` used by contracts and licenses.

## APIs

| Route | Who |
|-------|-----|
| `GET /api/it/hub/overview?orgId=` | Member of that org **or** platform pair of permissions |
| `GET /api/it/hub/fleet` | Platform pair only |
| `POST /api/it/hub/select-org` | Same as overview; writes an audit row on cross-org inspect |

Cross-org reads log `IT hub tenant inspected` with `metadata.hubAccess: true`.

## Permissions (no role-name bypass)

Super Admin (`role_super_admin`) already has `platform.view_all_orgs` in `role_permissions` on production and caalm-demo (`rp_sa_platform_view_all_orgs` / `rp_sa_plat_orgs`). Org Admin does **not** get this key.

## Roadmap

IT Development → Platform Readiness. Extends section 5 honesty: org data is live; host telemetry stays labeled.
