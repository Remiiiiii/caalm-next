# CAALM TicketOps research

Feature: AI-driven help-desk ticketing (codename TicketOps).
Date: 2026-08-12.

## 1. Enterprise pattern: submitter ticket vs engineer issue

Products like Jira Service Management, ServiceNow, Zendesk, and GitHub-backed bridges (SupportBee, Zendesk GitHub app) keep two records:

| Layer | Audience | System of record |
|---|---|---|
| Ticket | Submitter, IT managers | CAALM Appwrite `tickets` |
| Issue / PR | Engineers | GitHub Issues + Pull Requests |

Sync rules used here:

- The CAALM ticket is the customer-facing record (status, department, submitter, audit trail).
- The GitHub issue is the engineer-facing work item. CAALM never lets the browser create the issue.
- State moves one way from GitHub into CAALM for assignment, PR open, merge, and CI (webhooks).
- CAALM writes back to GitHub only at intake (create issue) and resolve (Cursor agent + `Fixes #N` in the PR body).
- Every transition appends a `ticket_events` row. Notifications fire on `ISSUE_CREATED` and `PR_OPENED`.

This matches Jira SM (request vs work item) and Zendesk+GitHub (ticket stays in the helpdesk; the issue is the engineering clone).

## 2. Appwrite status page layout (structure only)

Fetched [https://status.appwrite.online/incidents](https://status.appwrite.online/incidents).

Layout primitives used as a **structure** reference (not visual identity):

- Page title: "Previous incidents" archive, grouped by month.
- Each incident: date, title, status pill (`Resolved`), last update timestamp, short resolution copy, expandable "N previous updates" timeline.
- Empty months: "No incidents reported".
- No "Get Updates" or "Maintenance" tabs in TicketOps.

CAALM mapping:

- **Active queue** = live incidents (OPEN through IN_REVIEW / FAILED / NEEDS_HUMAN).
- **Ticket detail** = incident page with live GitHub issue body + comments.
- **Previous Incidents** = RESOLVED archive, collapsed timeline from `ticket_events`.

Visual identity stays CAALM: glass-card, brand `#0f5384`, `text-slate-700` / `text-slate-600`, Lucide icons, Poppins. Appwrite is layout density only.

## 3. Mobbin MCP references

Searched Mobbin (web) for status/incident and ticket-submit flows.

| Screen | App | Use |
|---|---|---|
| [Supabase help form](https://mobbin.com/screens/88416c16-475b-4148-9fed-6bb1e0a3ca5d) | Supabase | Submit form: subject, severity dropdown, description, attachments. Org/project are system-derived, not free-typed. |
| [Customer.io support modal](https://mobbin.com/screens/3abbe4a3-1915-495b-93b1-4ddd50f8ae1a) | Customer.io | Modal intake: description + submit. Keep CAALM submit as a dedicated page, not a cramped modal. |
| [LangChain report-a-bug](https://mobbin.com/screens/667836b7-39e3-4762-9213-6ff1e5b0d74c) | LangChain | Description + drag-drop attachments; Submit disabled until required fields exist. |
| [Featurebase ticket type](https://mobbin.com/screens/b32ccaf7-5489-40a1-9913-9bb6dbadc248) | Featurebase | Internal vs customer ticket types. TicketOps is internal (back-office) only. |
| [Customer.io workspace performance](https://mobbin.com/screens/b9743841-5a29-4454-bc39-133d7b0d7d9c) | Customer.io | Status pills + service list density for the active queue. |

Incident.io / Atlassian Statuspage screens were not returned by Mobbin; Appwrite status page + Customer.io status cards are the fallback.

## 4. Appwrite MCP schema read-out

Project `685ed77d00186ae8176b` (NextJs), database `caalm-dev` (`685ed87c0009d8189fc7`).

- **44 tables.** No `tickets`, `ticket_events`, or `webhook_deliveries` before this feature.
- Reuse: `users.division` / `users.fullName` for server-side intake; in-app bell notifications + Mailgun email; storage buckets `file_storage`, `media`, `profile_pictures`.
- Functions exist (Email Invite, deleteAppwriteUser, Demo Auth Cleanup) but TicketOps runs on **Next.js API routes**, not Appwrite Functions.
- Messaging is already used for transactional email; TicketOps uses Mailgun (same as calendar/invite).

New tables (camelCase to match CAALM): `tickets`, `ticket_events`, `webhook_deliveries`. Optional bucket `ticket_attachments`.

## 5. Design tokens (ui-ux-pro-max + CAALM)

`ui-ux-pro-max` was not executed from this session (local helper path blocked). Mapping uses CAALM Global Style Guide:

| Element | Token |
|---|---|
| Page container | `w-full px-4 sm:px-6 lg:px-8 xl:px-12` |
| Cards | `glass-card` + `glass-card-cap` |
| Clickable rows | `interactive-glass-card`, `cursor-pointer`, `duration-200` |
| Body / muted | `text-slate-700` / `text-slate-600` |
| Brand | `#0f5384`, `sidebar-gradient-text` |
| Icons | Lucide only |
| Buttons | `primary-btn px-3 sm:px-4` |
| Status pills | color + text label (not color alone) |
| Empty/error | Lucide + short message |

Anti-patterns: emoji icons, `scale-*` hover, Appwrite/Statuspage visual clone, indigo/Fira swap.

## 6. Decision log

| Decision | Choice | Why |
|---|---|---|
| Runtime | Next.js API routes | Matches Stripe webhooks, RBAC `requirePermission`, existing Mailgun email. |
| GitHub repo | `caalm-next` (this repo) | Product issues land where the code lives. |
| Resolve UI | Live GitHub fetch, no paste field | Prompt §4.5 overrides acceptance #4 paste wording. |
| IT manager notifications | `role_it_staff` + Super Admin via `tickets.view` / `tickets.assign` | Not the business Department Manager role. |
| Agent linking | CAALM puts `Fixes #N` in the PR instruction | Cursor agents may not comment on PRs. |
| Feature flag | `TICKETS_ENABLED` | GitHub App / Cursor keys may be missing in local/CI. |
| Status enum extras | `FAILED`, `NEEDS_HUMAN` | Rollback if the Cursor agent times out. |
| Column naming | camelCase | Matches existing Appwrite tables (`fullName`, `orgId`). |

## 7. Acceptance checklist

1. Submit creates one GitHub issue with server-derived submitter/department/timestamp; ticket `OPEN`.
2. Super Admin + IT receive in-app + email on issue create.
3. GitHub `issues.assigned` sets CAALM `ASSIGNED` without a manual sync.
4. Only assignee or Super Admin can Resolve; server re-fetches GitHub issue (no paste field).
5. Resolve starts a Cursor Cloud Agent against caalm-next with `Fixes #N` + tests instruction.
6. PR open notifies Super Admin + IT.
7. Merge + green CI moves ticket to `RESOLVED` and Previous Incidents.
8. Status tab is Incidents-only (active + previous); ui-ux-check against CAALM tokens.
9. This file documents Mobbin, Appwrite schema, and enterprise patterns.

## 8. GitHub App setup (ops)

1. Create a GitHub App on the caalm-next org/repo with Issues + Pull requests read/write, Contents read.
2. Install on `caalm-next`. Set `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`.
3. Webhook URL: `https://<host>/api/webhooks/github`. Secret: `GITHUB_WEBHOOK_SECRET`. Events: `issues`, `pull_request`, `check_suite`, `workflow_run`.
4. Set `CURSOR_API_KEY` for Resolve. Set `TICKETS_ENABLED=true` when ready.
