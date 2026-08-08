# Thermo-nuclear code quality review

**Scope:** Assistant / calendar slice (`7626e01` + working tree)  
**Date:** 2026-08-06

## Lint fix (prerequisite)

Fixed Biome `useAriaPropsSupportedByRole` errors:

- `HowItWorks.tsx` — added `role="status"` so `aria-label` is valid with `aria-live`
- `ProductSpotlight.tsx` — added `role="group"` so `aria-label` is valid

`pnpm lint-format` is clean after those fixes.

---

## Verdict

**Do not approve as-is.** Behavior mostly works, but several changes make the codebase harder to own. Biggest issues first.

### 1. Brand asset collision (blocker)

`public/assets/images/logo.png` was replaced with the 816KB robot mascot. That path is also the app favicon in `src/app/layout.tsx`. Assistant branding leaked into the global brand mark.

**Code judo:** Keep brand `logo.png` untouched. Use only `caalm-assistant.png` (one file) for assistant UI. Restore the original logo binary.

### 2. Triple identical PNGs (blocker)

`logo.png`, `caalm-assistant.png`, and `assistant.png` are the same ~816KB blob. Dead weight and confusion about the canonical asset.

**Fix:** One assistant asset; delete the duplicates; point all UI at it.

### 3. Files already over / pushed further past 1k lines (blocker)

| File | Lines |
|------|------:|
| `OutlookStyleCalendar.tsx` | ~6527 |
| `CalendarAIChat.tsx` | ~1370 |
| `tools/registry.ts` | ~1328 |

Date/time formatting was bolted into `OutlookStyleCalendar`. Avatar/outline styling was copied into `CalendarAIChat`. Tool handlers keep growing inside `registry.ts`.

**Code judo:**

- Extract calendar event detail helpers (date/time label) out of the 6k-line calendar file.
- Extract `AssistantAvatar` (image + outline classes) — stop pasting `outline outline-3 outline-[#D6E8F5] outline-offset-[-2px]` in 4+ places.
- Split `registry.ts` by domain: `calendarTools.ts`, `taskTools.ts`, `auditTools.ts`, thin registry index.

### 4. `refreshCalendarCache.ts` — three copies of one flow (structural)

`refreshCalendarAfterMeetingCreated` / `…Updated` / `…Removed` share the same shape: parse month → optimistic mutate → `noCache` fetch → dispatch event.

**Code judo:** One function, e.g. `refreshCalendarCache({ mode: "upsert" | "remove", event })`. Delete the other two exports or make them one-liners.

### 5. Spaghetti in client confirm path (structural)

`useCaalmAssistant.confirmAction` still digs `jsonData.result?.result` with ad-hoc casts for reschedule/cancel. That shape should be a typed execute response, not nested `unknown` peeling.

**Code judo:** Execute route returns a flat `calendarMutation: { kind, eventId, date, startTime, endTime }`. Client switches on `kind` once.

### 6. Activity feed semantics are wrong by default

`formatWhenMeta` prefixes **“Due …”** for schedule/task audit rows. Audit timestamps are not due dates. Keyword `classifyKind` on free-text titles will mis-tag forever.

**Code judo:** Meta is always the activity time (`Aug 6, 2026`). Kind comes from audit `action`/`module` enums (or a small map), not string includes on titles.

### 7. Dual payload for the same answer

`list_audit_logs` returns prose `"Here's the recent activity."` **and** `activityFeed` with the same title. Two sources of truth for one UI.

**Code judo:** Empty/short answer when `activityFeed` is present; card owns the copy. Or answer-only with no structured card — not both.

### 8. Working tree noise

Biome rewrote hundreds of unrelated files. Shipping that with the assistant feature buries the real diff.

**Fix:** Assistant/calendar changes in one PR; format-only churn separate or reverted from this branch.

### 9. Thin / accidental abstraction debt

- Gemini history fix is good and properly extracted — keep that pattern.
- Pending actions in Redis — good boundary.
- Cache manager “glob clear” on Vercel KV is still a no-op for pattern deletes; exact `del` with `userId` is the real fix. Don’t pretend `cache.clear("calendar:events:*")` works on KV.

---

## Approval bar (skill)

| Check | Status |
|-------|--------|
| No structural regression | Fail — logo overwrite, 1k+ files growing |
| Dramatic simplification taken when visible | Fail — calendar refresh + avatar CSS + registry |
| No unjustified file-size explosion | Fail |
| No spaghetti special-cases | Fail — confirm casts, “Due” on audits, title classify |
| Canonical helpers / layers | Partial — some good extracts, still wrong homes |

**Required before approve:** Restore brand `logo.png`; collapse to one assistant PNG + one `AssistantAvatar`; collapse calendar refresh APIs; stop growing `OutlookStyleCalendar` / `registry.ts` without splits; fix activity-feed time labeling; separate biome churn from feature commits.

**Verify lint:** `pnpm lint-format`
