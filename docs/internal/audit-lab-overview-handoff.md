# Audit Lab Overview — Agent Hand-off

**Date:** 2026-11-16
**Branch:** `cursor/audit-lab/full-spec`
**Scope:** `/audit-lab/overview` page — `src/components/audit-lab/AuditLabClient.tsx`, `AuditLabShell.tsx`, `src/lib/audit-lab/overview.ts`

## Purpose

Build out the Audit Lab Overview surface so it renders convincing, demo-ready content (mock data where real data is sparse) and matches a design spec for the four stat cards, while keeping every piece correct for orgs that *do* have real sessions/evidence/findings. This has been one continuous session of iterative polish: mock data → layout fixes → stat-card redesign per a written spec → entrance animation.

## Current state — what's done and verified

### Navigation
- Replaced the 208px sidebar sub-nav with a `SegmentedToggle` under the page title/description (`AuditLabShell.tsx`). Verified click-through navigation works.

### Overview page sections
- **Stat cards (4):** Readiness score, Open rehearsal gaps, Evidence coverage, Sessions this quarter.
  - Equal-height mechanism implemented per a user-supplied spec doc ("Stat Card Equal-Height Spec"): Readiness score is the reference card; a `ResizeObserver` (`useLayoutEffect` in `AuditLabClient.tsx`) measures its natural height and writes it to a `--stat-card-height` CSS var on the grid container (`statGridRef`). The other three cards consume that var via inline `style={{ height: "var(--stat-card-height, auto)" }}` + `overflow-hidden`, with `items-start` on the grid turning off default stretch. `pinFooter` on `MetricStatCard` pushes each card's footer content to the bottom.
  - **Readiness score**: value + trend (▲N) + progress bar + "By department" capped hover-scroll list (real `coverageByDept` when evidence exists, else a mock fallback — `readinessDeptBreakdown` — matching the spec image exactly: HR 91%/Finance 82%/Legal 76%/IT 58%) + "vs. X% last quarter · N departments in scope" footer line (`lastQuarterReadiness` is back-derived from `readinessTrend`, not real historical data — see Known shortcuts below).
  - **Open rehearsal gaps**: value + trend (▼ label) + segmented bar (Evidence/Owner/Policy categories — **not** a real schema field, see shortcuts) + a small bar-chart ("7-week trend") + "oldest gap: Nd" caption.
  - **Evidence coverage**: value + "N of M items accepted" caption + 4-segment bar (Accepted/Overdue/Not started/Other).
  - **Sessions this quarter**: value + colored unit-block row (one block per session, colored by status) + status legend + "Next up: <title> / <date> · prep deadline in N days" footer.
- **Suggested for review**: 3 cards, Schedule buttons horizontally aligned via `flex h-full flex-col` + `mt-auto` wrapper (fixes the 2-line-title card pushing its button down).
- **Upcoming sessions**: paginated (6/page via `PageIndex`), fixed-column-position row layout (title/avatars/date/status all land at identical x across every row — this took many iterations, see Known-tricky-bits), card height is `max-h-[521px]` and shrinks to content on short pages, footer follows content directly (not pinned to a fixed bottom).
- **Recent activity**: icon-chip row style (tinted square + tone icon + bold inline text + right-aligned timestamp), `max-h-[521px]` matching Upcoming sessions' height, internally scrollable past that cap using the app's existing global hover-only scrollbar CSS.
- **Loading state**: dedicated `AuditLabOverviewSkeleton` (reuses existing `ActivityItemSkeleton`) instead of a generic "Loading…" card, scoped to `surface === "overview"`.
- **Entrance animation**: scroll-triggered (`whileInView` + `viewportOnce` from `@/components/landing/motion`, not mount-triggered `animate`) — staggered fade-up for the stat cards, scale-in for "Suggested for review", fade-left/fade-right for the Upcoming-sessions/Recent-activity pair.

### Housekeeping
- `.playwright-mcp/` added to `.gitignore` (Playwright MCP's auto-saved `.yml`/`.png`/`.log` artifacts were piling up in git status — ~100+ files at one point). Cleaned up the accumulated junk.
- `.cursor/rules/playwright-png-cleanup.mdc` (source of truth, imported in `CLAUDE.md`) broadened from "clean up `.png` screenshots" to "clean up everything Playwright MCP writes" — the gap was that plain `browser_navigate`/`browser_snapshot` calls also write `.yml` snapshots, which weren't being tracked for cleanup.
- Em dashes removed from all mock/demo text I authored in `overview.ts`/`AuditLabClient.tsx`; `.cursor/rules/general.mdc` (always-on) got a new hard rule against em dashes in authored copy, since the prior rule only covered marketing/docs copy.

## Known shortcuts (intentional, flagged with `// shortcut:` comments in code)

None of these are bugs — they're deliberate simplifications because the underlying schema doesn't have the field the spec image implies:

- **Gap categories (Evidence/Owner/Policy)**: `ReviewGap` has no category field. `gapSegments` always does a proportional 5/3/4-of-12 split off the headline count — real or mock, it's never a per-gap category lookup.
- **7-week gap trend bar chart**: no weekly gap-count history is tracked anywhere. `gapWeeklyTrend` is a static illustrative shape (`[40,55,35,60,45,70,100]`), and `oldestGapDays = 14` is a constant.
- **"vs. X% last quarter"**: no historical snapshot exists. `lastQuarterReadiness = readinessScore - readinessTrend` — arithmetic, not a real stored value.
- **Evidence "Overdue"/"Other" buckets**: real evidence is bucketed by `status === accepted`, `not_started`/`not_applicable` → Not started, `dueAt < now` → Overdue, everything else → "Other"/"In progress". This is a reasonable heuristic, not a guaranteed-correct business rule.
- **Session status breakdown fallback**: `sessionSegments` computes a real breakdown from `sessions` filtered to non-cancelled, but **falls back to the mock Scheduled-2/Prep-1/In-progress-1/Done-1 split whenever the real breakdown's total doesn't match `stats.sessionsThisQuarter`** — this matters because an org can have the *mock* headline count (5, from `overview.ts`'s stat fallback) while also having one or two *real* (incomplete) session rows, and a naive "real sessions exist → use real breakdown" check produced a visibly broken 1-of-5 result. See the `realTotal !== total` guard.
- **"Next up" session**: picks the first `upcomingItems` entry that has a truthy `scheduledAt` (not just `upcomingItems[0]`), because the padding logic in `overview.ts` can put a real-but-blank-date session first.

## Known-tricky-bits / where to be careful if touching this again

1. **Upcoming sessions row alignment** went through ~10 rounds of back-and-forth (centering avatars, then un-centering, then fixed-grid-columns vs. flex-with-justify-between, then a user-caught regression where a flex refactor collapsed the two-column grid into one column). The **current, user-approved end state** is a fixed 4-column CSS grid per row (title capped at `calc(50%-2.5rem)`, avatar 4rem, date 6rem, status `1fr` + `justify-self-end`) with small per-element `translate-x`/`margin` nudges for exact pixel positioning the user asked for. **Do not** convert this back to flex/space-between without re-confirming with the user — that exact change was explicitly rejected once already ("You just negated all the work we've been doing").
2. **Playwright viewport testing in this environment**: `page.setViewportSize()` only affects `window.innerWidth/innerHeight` as seen by scripts — it does **not** resize the actual physical Chrome window painted via CDP on this persistent profile. Screenshots will stay clipped at the real window's physical size regardless of what you set. To get a full, unclipped screenshot, measure the real content height (`document.querySelector('.overflow-y-auto').scrollHeight` — this app scrolls an **inner div**, not `document.body`) and treat that as informational only; don't trust `fullPage: true` screenshots to auto-capture beyond the physical window.
3. **Backgrounded-tab animation freeze**: if `whileInView`/`animate` animations appear permanently stuck at their `initial` (hidden) state no matter what you change, check `document.hidden`/`document.hasFocus()` before assuming it's a code bug. Chrome does not run `requestAnimationFrame` for hidden/unfocused tabs, and this session's persistent Chrome window was backgrounded for a long stretch, causing every single motion element (verified with a bare, isolated, variant-free `motion.div`) to freeze identically. `page.bringToFront()` fixes it for the current tab. This cost a full debugging cycle (including an unnecessary dev-server restart) before being traced to this — don't repeat that.
4. There's a **leftover `/c/Users/victo/Development/caalm-next/.playwright-mcp/`** cleanup habit now required every turn that uses Playwright MCP — see the broadened rule in `.cursor/rules/playwright-png-cleanup.mdc`.

## Not yet done / possible next steps

- The full stat-card redesign has been verified via direct DOM text/attribute checks (department names, percentages, segment labels, next-up text all confirmed present with correct values) but **not yet via a clean, unobstructed full-page screenshot** — the verification session got sidetracked chasing the backgrounded-tab animation issue. Worth one more `bringToFront()` + full screenshot pass to visually sign off.
- Icon choices on the 4 stat cards were explicitly deferred ("disregard the icon difference") — spec mockup uses a people/org-chart icon, target/flag icon, document icon, and calendar icon; current code uses `Star`, `ClipboardList`, `Globe`, `CalendarRange`. Revisit if/when the user wants exact icon parity.
- The `Practice & Roleplay` nav icon was found swapped from `GraduationCap` to `Globe` on disk mid-session (not a change I made) — flagged to the user once, never explicitly resolved either way.
- Other uncommitted changes on this branch from before this session (`docs/internal/audit-lab-decision.md`, `scripts/provision-audit-lab-schema.mjs`, `src/app/api/audit-lab/practice/route.ts`, several new untracked files under `src/app/api/audit-lab/`, `src/components/audit-lab/`, `src/lib/audit-lab/`) were **not touched or reviewed** in this session — out of scope, but worth a look before this branch is considered PR-ready as a whole.
- No commits have been made this session (per standing "no auto stage/commit/push" rule) — everything described above is uncommitted working-tree state.
