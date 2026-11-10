# Ask CAALM — dedicated paths inventory

Plain-English map of how Ask CAALM decides what to do, what already has a **dedicated path** (code that runs without hoping the language model guesses the right tool), and what is still **missing**.

A dedicated path is like a labeled hallway: the app recognizes the ask, then walks a fixed route (form, Confirm card, or tool call). If there is no hallway, the ask falls into a big open room (the LLM + help docs), which often ends as empty text → **"I could not generate a response."**

Primary code:

- Intent keywords: `src/lib/assistant/intent.ts` (`detectDataIntent`)
- Turn router: `src/lib/assistant/runAssistantTurn.ts`
- Tools: `src/lib/assistant/tools/**` (assembled in `registry.ts`)

---

## Why “change Quinn Patel … role to content creator” failed

1. **No intent** for role change. `detectDataIntent` does not return anything like `assign_user_roles`. That message becomes `null` (help / RAG turn).
2. **No deterministic path** for `assign_user_roles`, even though the tool exists.
3. The model was not forced to call a tool (`forceTool` is false when intent is `null`).
4. Claude/Gemini returned **no tool call and no text** → fallback string: `"I could not generate a response."` (see `runAssistantTurn.ts` around the Claude/Gemini branches).
5. Screenshot sources (Welcome demo, What is CAALM, Audits, Roles and permissions) are **RAG help links**, which matches a help turn — not a live role update.
6. Even with a good path, **"Content Creator"** is not a standard CAALM invite/org role name. A proper path should open Confirm with a real role from `list_roles`, or say the role is unknown — not invent success.

---

## How a turn is classified

| Stage | What happens |
| --- | --- |
| 1. Intent | `detectDataIntent(message)` → keyword hint or `null` |
| 2. Dedicated (deterministic) | Early `return` in `runAssistantTurn` (form / Confirm / tool) — **no LLM required** |
| 3. Audit remediation | Special branch when `remediationContext` is set |
| 4. LLM | Gemini or Claude; `forceTool` may nudge “must call a tool” |
| 5. Tool / text | Run tool (Confirm if mutating) or show model text; empty text → failure copy |

**Dedicated path** = stage 2 (or a forced, reliable stage 4→5 for that intent).  
**Missing dedicated path** = tool or ask type that still depends on the model luck, or has no intent at all.

---

## Legend

| Status | Meaning |
| --- | --- |
| **Dedicated** | Intent + early deterministic branch (or remediation) |
| **Force only** | Intent + `forceTool`, but still needs the LLM to pick the tool |
| **Tool only** | Tool exists; no matching intent / no deterministic branch |
| **Missing** | Needed for solid UX; not wired end-to-end yet |

---

## Current dedicated paths (deterministic)

These skip the “empty model reply” failure mode for the happy path (permission allowing).

| Intent (`detectDataIntent`) | Example ask | What the path does | Tool / UI | Notes |
| --- | --- | --- | --- | --- |
| `invite_user` | “Invite Chris…”, form `People` / `Role` / `Department` | Directory match → multi/single invite form → Confirm | `invite_user` / `invite_users` | Strongest user path today |
| `update_user_profile` | “Rename X to Y” (name patterns only) | Parse rename → Confirm | `update_user_profile` | **Only rename**; job title / department / division still mostly LLM |
| `create_task` | “Create a task…” | Draft → pending Confirm card | `create_task` | |
| `schedule_event` (partial) | “Schedule a meeting” **without** date+time | Inline schedule form | later `create_calendar_event` | If date+time already present → falls to LLM + `forceTool` |
| `list_tasks` | “Show my pending tasks” | Calls `list_tasks` | `list_tasks` | |
| `list_users` | “List users”, “users in IT” | Calls `list_users` (+ `parseDepartmentFilter`) | `list_users` | |
| `list_departments` | “List departments” | Calls `list_departments` | `list_departments` | Catalog names, not people |
| `list_roles` | “What roles do we have?” | Calls `list_roles` | `list_roles` | |
| *(remediationContext)* | Audit finding assist | Research / Confirm CAP remediation | `apply_audit_remediation`, etc. | Not from `detectDataIntent` |

---

## Intents that exist but are force-tool only (not fully dedicated)

Model must still call the right tool. If it returns blank text instead, user sees **"I could not generate a response."**

| Intent | Example ask | Expected tool | Gap |
| --- | --- | --- | --- |
| `list_pending_approvals` | “Show my pending approvals” | `list_pending_approvals` | No deterministic `runToolByName` |
| `search_contracts` | “Find the Acme contract” | `search_contracts` | No deterministic search with query parsed from message |
| `search_licenses` | “List licenses…” | `search_licenses` | Same |
| `expiring` | “What’s expiring soon?” | `list_expirations` | No deterministic call |
| `view_schedule` | “What’s on my calendar?” | `list_calendar_events` | No deterministic call / date parse |
| `view_audit` | “Show recent activity” | `list_audit_logs` | No deterministic call |
| `complete_task` | “Mark the budget task done” | `complete_task` | No parse → Confirm path |
| `reschedule_event` | “Move the review to 10am” | `reschedule_calendar_event` | No parse → Confirm path |
| `cancel_event` | “Cancel my meeting tomorrow” | `cancel_calendar_event` | No parse → Confirm path |
| `schedule_event` (when date+time present) | “Schedule standup tomorrow 2–2:30” | `create_calendar_event` | Form skipped; relies on LLM |
| `update_user_profile` (non-rename) | “Change Dana’s department to IT” | `update_user_profile` | Intent may miss; no general profile parse path |
| `invite_user` / `list_*` | (already dedicated above) | — | Also listed in `forceTool` for fall-through cases |

---

## Registered tools vs path coverage

### Core / contracts / licenses / reports

| Tool | Permission (approx.) | Intent | Dedicated? | Status |
| --- | --- | --- | --- | --- |
| `get_page_help` | `ai.chat` | none | no | Tool only (LLM) |
| `navigate` | `ai.chat` | none | no | Tool only |
| `search_contracts` | contracts.view | `search_contracts` | force only | Missing dedicated |
| `search_licenses` | licenses.view | `search_licenses` | force only | Missing dedicated |
| `list_pending_approvals` | events.approve | `list_pending_approvals` | force only | Missing dedicated |
| `list_expirations` | contracts/licenses view | `expiring` | force only | Missing dedicated |
| `generate_report` | settings.view | none | no | Tool only / Missing intent + path |

### Tasks

| Tool | Intent | Dedicated? | Status |
| --- | --- | --- | --- |
| `list_tasks` | `list_tasks` | **yes** | Dedicated |
| `create_task` | `create_task` | **yes** | Dedicated |
| `complete_task` | `complete_task` | force only | Missing dedicated Confirm |
| `create_task_for_contract` | none | no | Tool only / Missing |

### Calendar

| Tool | Intent | Dedicated? | Status |
| --- | --- | --- | --- |
| `list_calendar_events` | `view_schedule` | force only | Missing dedicated |
| `create_calendar_event` | `schedule_event` | partial (form if vague) | Missing full dedicated when details present |
| `reschedule_calendar_event` | `reschedule_event` | force only | Missing dedicated |
| `cancel_calendar_event` | `cancel_event` | force only | Missing dedicated |

### Audit

| Tool | Intent | Dedicated? | Status |
| --- | --- | --- | --- |
| `list_audit_logs` | `view_audit` | force only | Missing dedicated |
| `confirm_finding` | remediation / LLM | partial via remediation | Missing general intent |
| `apply_audit_remediation` | remediation | **yes** (context) | Dedicated when launched from audit UI |
| `prepare_close_corrective_action` | remediation / LLM | partial | Missing general NL intent |

### Users / org (where the role bug lives)

| Tool | Intent | Dedicated? | Status |
| --- | --- | --- | --- |
| `list_users` | `list_users` | **yes** | Dedicated (+ department filter) |
| `list_departments` | `list_departments` | **yes** | Dedicated |
| `list_roles` | `list_roles` | **yes** | Dedicated |
| `invite_user` / `invite_users` | `invite_user` | **yes** | Dedicated |
| `resend_invite` | none | no | **Missing** intent + path |
| `assign_user_roles` | **none** | **no** | **Missing** — root cause of role-change failure |
| `deactivate_user` | none | no | **Missing** intent + Confirm path |
| `update_user_profile` | `update_user_profile` | partial (rename only) | Missing full profile-field path |
| `update_org_settings` | none | no | **Missing** intent + path |

### Pseudo-tool

| Name | Dedicated? | Status |
| --- | --- | --- |
| `request_input` | LLM-driven | Form renderer when model calls it; not an intent |

---

## Missing dedicated paths (priority backlog)

Ordered by how often users hit blank / wrong answers.

### P0 — mutating user admin (matches the screenshot)

| Proposed intent | Example ask | Target | Dedicated behavior |
| --- | --- | --- | --- |
| `assign_user_roles` | “Change Quinn Patel’s role to Viewer” | `assign_user_roles` | Parse person + role + mode → validate role against org roles → Confirm card; unknown role → friendly list from `list_roles` |
| `deactivate_user` | “Deactivate support1.chart@…” | `deactivate_user` | Parse person + activate/deactivate → Confirm |
| `update_user_profile` (expand) | “Set Dana’s department to IT” | `update_user_profile` | Parse field patches beyond rename → Confirm |

### P1 — force-only → dedicated read paths

| Intent already exists | Make dedicated by |
| --- | --- |
| `list_pending_approvals` | `runToolByName` + `formatGenericDataAnswer` |
| `search_contracts` / `search_licenses` | Parse query string from message → tool |
| `expiring` | Call `list_expirations` with default days |
| `view_schedule` | Parse day → `list_calendar_events` |
| `view_audit` | Call `list_audit_logs` |

### P1 — force-only → dedicated write / Confirm paths

| Intent already exists | Make dedicated by |
| --- | --- |
| `complete_task` | Parse task title → Confirm `complete_task` |
| `reschedule_event` | Parse title + time/date → Confirm |
| `cancel_event` | Parse title/date → Confirm |
| `schedule_event` (full) | If date+time present, Confirm `create_calendar_event` without LLM |

### P2 — tools with no intent today

| Tool | Proposed intent examples |
| --- | --- |
| `resend_invite` | “Resend invite to …” |
| `generate_report` | “Generate a report for Finance” |
| `create_task_for_contract` | “Create a task for the Acme contract” |
| `update_org_settings` | “Set org timezone to …” |
| `navigate` | “Open Licenses” (optional; low risk to leave LLM) |
| `get_page_help` | usually fine as help/`null` intent |

---

## Failure modes when a dedicated path is missing

| Symptom | Likely cause |
| --- | --- |
| “I could not generate a response.” | LLM returned empty text and no tool call (`runAssistantTurn`) |
| Help Sources pills (Welcome / What is CAALM / …) | Intent was `null` → RAG help turn |
| Wrong list (e.g. departments instead of users) | Intent collision or missing people filter (partially fixed for departments vs users) |
| Confirm never appears for a write | Mutating tool never called; or no deterministic Confirm builder |
| Permission error after Confirm | Tool `requiredPermissions` — expected; dedicated path should still explain clearly before Confirm when possible |

---

## Suggested definition of “done” for a dedicated path

For each high-value ask type:

1. **Intent** in `detectDataIntent` (keyword tests + unit tests).
2. **Parser** for ids/names/dates/roles from the message (or an input form).
3. **Early branch** in `runAssistantTurn` that does not depend on empty model text.
4. **Mutations** → `storePendingAction` + Confirm card (never silent write).
5. **Unknown values** (e.g. fake role “Content Creator”) → plain-English error + optional `list_roles` / suggestions.
6. **`forceTool` / suggestions** kept as backup, not the only path.

---

## Quick map: screenshot ask → desired path

| User said | Today | Desired dedicated path |
| --- | --- | --- |
| change Quinn Patel (support1.chart@example.com) role to content creator | Intent `null` → help RAG → empty model → failure copy | Intent `assign_user_roles` → resolve Quinn by email → lookup role “content creator” → **unknown role** message listing real roles **or** Confirm if role exists |

---

## File cheat sheet

| Concern | File |
| --- | --- |
| Intents | `src/lib/assistant/intent.ts` |
| Deterministic + LLM turn | `src/lib/assistant/runAssistantTurn.ts` |
| Role assign tool | `src/lib/assistant/tools/userTools.ts` → `assign_user_roles` |
| Tool registry | `src/lib/assistant/tools/registry.ts` |
| Invite / rename parsers | `parseInviteDraft.ts`, `parseUserProfileUpdate.ts` |
| Suggestions chips | `src/lib/assistant/suggestions.ts` |
| Intent tests | `src/lib/assistant/intent.test.ts`, `tests/ai/assistantIntent.test.ts` |
