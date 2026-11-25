# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/caalm/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **Product UI source of truth:** `.cursor/rules/global-style-guide.mdc`.
> This Master file is the short CAALM-facing summary for agents and the ui-ux-pro-max skill.
> If anything here disagrees with the style guide, follow the style guide.
>
> **Inventory (what exists in code):** `design-system-inventory.md`.

---

**Project:** CAALM  
**Updated:** 2026-11-21  
**Category:** Enterprise CLM / analytics dashboard (desktop-first)

---

## Global Rules

### Color Palette

| Role | Hex / token | Usage |
|------|-------------|--------|
| Brand blue | `#0f5384` | Primary titles, links, selected text, focus rings |
| Teal accent | `#078FAB` | Meters, secondary accents, dialog icon wells, form focus |
| Success green | `green` → `#3DD9B3` | Active / ok pills (`bg-green/10 text-green border-green/20`) |
| Warning orange | `orange` → `#F9AB72` | Pending / draft pills |
| Danger red | `red` → `#FF7474` | Expired / action-required / stuck pills |
| Info blue | `blue` → `#56B8FF` | Category / in-progress / signature pills |
| Body text | slate-700 / 600 / 500 | Primary / secondary / muted — never inherited black |
| Borders | `border-slate-200` | Cards, dividers; form fields use `border-[0.25px] border-slate-300` (`#CBD5E1`) |
| Dropdown hover fill | `#F2F5F9` | Menu row highlight; text `#3d5677` when selected |

**Hard rule:** CAALM palette wins over any spec, mockup, or PNG CSS. Map layout from the spec; map colors onto CAALM tokens.

### Typography

- **App UI font:** Poppins (`font-poppins` on `<body>`)
- **Do not use** Fira, Inter, or `font-mono` for product UI (except true code blocks)
- **Page / section / card titles:** `sidebar-gradient-text`
- **Body:** `text-slate-700`; muted helpers `text-slate-500`
- **Table primary title:** `DATA_TABLE_PRIMARY_TITLE` → `font-semibold text-[#0f5384]`
- **Table subtext:** `DATA_TABLE_PRIMARY_SUBTEXT` → `caption text-slate-500`
- **Table body text:** `DATA_TABLE_BODY_TEXT` → `text-sm text-slate-600`
- **Numbers in columns/meters:** `tabular-nums`

### Spacing

| Token | Value | Usage |
|-------|-------|--------|
| Tight | `4px` / `0.25rem` | Icon gaps inside chips |
| Inline | `8px` / `0.5rem` | Chip icon + label |
| Standard | `16px` / `1rem` | Card padding baseline (`p-4`) |
| Section | `24px` / `1.5rem` | Card padding `sm:p-6`, grid `gap-6` |
| Large | `32px`+ | Page section margins |

Stat / content grids use `gap-6` by default. Dense meta attribute rows may use `gap-x-4` / column padding with dividers.

### Shadow Depths

Prefer glass-card elevation (blur + soft border) over heavy drop shadows. Keep shadows subtle on product shells.

### Desktop-first

Authenticated product UI is **desktop-primary** from **1024px** (`DESKTOP_MIN_WIDTH`). Phones only get companion interrupt routes. See `.cursor/rules/desktop-first.mdc`.

---

## Component Specs

### Cards

**Hard rule:** Every card, page content shell, table panel, and widget uses CAALM glass — not a solid white or slate fill shell.

```tsx
<Card className="glass-card">
  <div className="glass-card-cap" />
  <CardContent className="text-slate-700">{/* … */}</CardContent>
</Card>
```

- Classes: `glass-card` + `glass-card-cap` (required). Clickable: also `interactive-glass-card`.
- Forbidden for main shells: `bg-white` + `border-slate-*` + `shadow-sm` as a stand-in for a card.
- Nested finding / detail panels inside a glass page may use a light bordered surface when they are **content rows**, not page shells — still use CAALM text/pills.

### Buttons

- Primary page actions: `btn-primary` / `primary-btn` + `px-3 sm:px-4` + Lucide icon (`h-4 w-4`) + label
- Delete actions: `delete-btn px-3 sm:px-4` + Lucide icon + label
- Do not ship text-only primary actions or plain `variant="destructive"` as the final look
- **IT routes / Ask CAALM response bubbles:** no `btn-primary` gradient pills (plain text Cancel / Confirm). See `it-routes-buttons.mdc` and `assistant-response-bubble-buttons.mdc`.

### Segmented toggles

Use `SegmentedToggle` from `@/components/ui/segmented-toggle` for status filters and list/grid switches.

- Supports `count` on each tab
- Contracts / Licenses / Approvals status bars use this via `StatusUnderlineTabs` (thin adapter)
- Do not invent a second underline-tab status bar for those surfaces

### Data tables

**Chrome source of truth (layout):** Assign Tasks (`/team/tasks`, `TasksDataTable.tsx`)  
**Typography / Actions source of truth:** Audit Readiness Fix next (`ReadinessFixNextTable.tsx`)

Use `CaalmDataTable` + tokens from `@/components/ui/caalm-data-table` (re-exported from `src/lib/ui/data-table-styles.ts`).

| Piece | Token / rule |
|-------|----------------|
| Shell | `CaalmDataTable` — inset + **no horizontal scrollbar** (`overflow-x-hidden`) |
| Toolbar above table | `DATA_TABLE_TOOLBAR_INSET` |
| Header row | `DATA_TABLE_HEADER_ROW` |
| Header cell | `DATA_TABLE_HEADER_CELL` |
| Sortable header | `SortableDataTableHead` |
| Body row | `DATA_TABLE_BODY_ROW_CLICKABLE` or `DATA_TABLE_BODY_ROW_BASE` (both include `group`) |
| Cell padding | `DATA_TABLE_CELL` / `_FIRST` / `_LAST` |
| Primary title | `DATA_TABLE_PRIMARY_TITLE` (first **content** column; not the checkbox) |
| Primary subtext | `DATA_TABLE_PRIMARY_SUBTEXT` |
| Other body text | `DATA_TABLE_BODY_TEXT` |
| Actions header | `DATA_TABLE_ACTIONS_HEAD` — **no visible "Actions" label**; `sr-only` only; `w-14` |
| Actions trigger | `DATA_TABLE_ACTIONS_TRIGGER` — opacity 0 until row hover / focus-within |
| Empty / loading | `CaalmDataTableEmpty` / `CaalmDataTableSkeleton` |
| Bulk selection | `BulkActionDock` (glass pill at bottom); selected rows `bg-blue/10` + 2px `#0f5384` left bar |
| Progress bars | `AnimatedBar` (teal `#078FAB`) |

Person cells: `Avatar` size `"md"` (`ASSIGN_SIZE` from `TaskAssigneePicker`) + name `text-xs font-medium text-slate-700` when shown beside the avatar (Fix next pattern). Prefer photo → initials; never bare name-only as the only person signal.

### Overflow menus (3-dot)

Use the Contracts table trigger. Do **not** use Lucide `MoreVertical`.

- Icon: `/assets/icons/dots.svg` at **34×34** (stroke slate-500 `#64748b`)
- Trigger: `shad-no-focus inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-transparent text-slate-500`
- **No hover fill** on the 3-dot button
- Table rows: wrap trigger in `DATA_TABLE_ACTIONS_TRIGGER`; ensure row has `group`
- Items: `AppDropdownMenuItem` with a Lucide `icon`
- If the menu has Delete or Archive, put `<DropdownMenuSeparator />` immediately **above** that item and use `tone="danger"`

Reference: `src/components/ActionDropdown.tsx`

### Dropdown menus

Translucent glass (`bg-white/10` + blur) — **never** a card-cap on dropdowns. Nested levels match. Scrollable lists use `DropdownScrollArea`.

### Badges / chips

Use CAALM tint pills, not default shadcn Badge variants.

**Shape (required):** `rounded-full` pill.

```tsx
<span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
  {/* optional Lucide icon h-3.5 w-3.5 shrink-0 */}
  Label
</span>
```

| Meaning | Classes |
|---------|---------|
| Active / success | `bg-green/10 text-green border-green/20` |
| Pending / draft / negotiation | `bg-orange/10 text-orange border-orange/20` |
| Danger / expired / action required / stuck | `bg-red/10 text-red border-red/20` |
| Info / signature / in progress | `bg-blue/10 text-blue border-blue/20` |
| Neutral / inactive | `bg-slate-100 text-slate-600 border-slate-200` |

**Contract status column (split pill):** one `rounded-full` pill; optional alert half with hairline divider (stuck). Sub-label under the pill at `10px` muted (`0 of 2 approved`). Component: `ContractLifecycleStatusBadge`.

**Rules:**

- No colored dots inside the pill
- Capitalize labels; do not dump raw enums
- Short status labels may use `whitespace-nowrap`
- Long labels in dense grids: wrap with `min-w-0` / `break-words`
- No `title=` / hover tooltips on badges unless product asks

### Avatars

Uploaded profile photo when available; otherwise initials via `@/components/ui/avatar` with ProfilePicture ring tokens. Table / picker person cells default to size `"md"` (32px) unless a denser stack requires otherwise.

Name-only person cells: avatar first; tooltip with full name is allowed **only** on avatar person cells (style-guide exception). Elsewhere: no tooltips unless product asks.

### Inputs

Every standalone text input, select, textarea, and search field must have a **visible** `0.25px solid #CBD5E1` (`border-[0.25px] border-slate-300`) border. Do not use 1px (`border`), white, translucent, or `slate-200` borders on light fills. Search fields in a filter row use `h-10` to match adjacent selects.

### Modals / dialogs

- Overlay: dim + light blur
- Header: brand title color `#0f5384`, white icon well, description muted
- Confirm: `btn-primary`; destructive: `delete-btn`
- Content area: `bg-slate-50` patterns from the style guide
- Use `AppDialog` / shared confirm patterns — see style guide Dialog section

### Meta attribute grids (detail cards)

When a card shows a row of labeled attributes (Severity, Risk, Classification, History, Due):

- Uppercase micro labels: `text-[10px] font-semibold uppercase tracking-wide text-slate-500`
- Desktop column dividers: `border-l border-slate-200/80` with enough horizontal padding
- Cells: `min-w-0` so flex/grid children can shrink

### Tooltips (hard rule)

- **Do not** add tooltips (`title=`, Radix Tooltip, hover hint chips) unless the user or product ticket explicitly asks
- Exception: avatar person cells may show the full name on hover
- Truncation is not a reason to invent a tooltip — wrap, reflow, or shorten the visible label instead

### User-facing errors

Toasts, dialogs, and API `error` fields shown to users must be plain human language via `toUserFacingErrorMessage`. Never surface raw JSON, stack traces, or vendor payloads. See `.cursor/rules/user-facing-errors.mdc`.

---

## Style Guidelines

**Style:** Data-dense enterprise dashboard (desktop-first from 1024px)

**Keywords:** Glass cards, KPI / metric cards, data tables, CAALM pills, segmented toggles, space-efficient grids

**Best For:** Contract / license lifecycle, audit findings review, org admin, readiness, analytics

**Key Effects:** Row highlight on hover, hover-reveal row actions, smooth filter animations, skeletons inside glass cards, page-entrance motion that honors `prefers-reduced-motion`

**Loading spinners (hard rule):** The branded CAALM page-load spinner (`LoadingSpinner` `md` / `lg` / `fullScreen`) is **only** for route transitions, auth gates, and initial/full page loads. Glass cards and card-like panels must use `LoadingSpinner size="sm"` or skeletons — never the large page-load spinner.

### Page Pattern

Authenticated product pages: full-width container `w-full px-4 sm:px-6 lg:px-8 xl:px-12`, glass metric strip + glass table / list, desktop-first (companion routes only on phone). Marketing / landing pages stay responsive under their own page override files.

---

## Anti-Patterns (Do NOT Use)

- ❌ Spec / mockup hex that fights CAALM brand blue / teal / pill tokens
- ❌ Solid white card shells instead of `glass-card` + `glass-card-cap`
- ❌ Default shadcn Badge variants as the final look
- ❌ Non-pill badges (`rounded-md`) for status chips
- ❌ Visible "Actions" header text on data tables
- ❌ Lucide `MoreVertical` for row overflow (use `dots.svg`)
- ❌ Hover fill on the 3-dot trigger
- ❌ Horizontal scrollbars on product data tables (`overflow-x-auto`)
- ❌ Underline status tabs on contracts/licenses/approvals (use `SegmentedToggle`)
- ❌ Tooltips on chips, table cells, or labels unless explicitly requested
- ❌ Truncating long classification / status chips without wrapping when the column has room
- ❌ Emojis as icons — use Lucide SVG
- ❌ Missing `cursor-pointer` on clickable elements
- ❌ Layout-shifting hover scales
- ❌ Low-contrast or inherited black body text
- ❌ Instant state changes with no 150–300ms transition
- ❌ Invisible focus rings
- ❌ Branded page-load spinner inside glass cards
- ❌ Em dashes (—) in UI copy, comments, or docs prose

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] CAALM palette (not mockup CSS) on colors and pills
- [ ] `glass-card` + `glass-card-cap` on page shells / widgets
- [ ] Primary actions use `btn-primary` + Lucide icon; deletes use `delete-btn`
- [ ] Badges are `rounded-full` CAALM tint pills; long chips wrap inside `min-w-0` cells
- [ ] Tables use `CaalmDataTable` + primary/body/actions tokens; no horizontal scroll; Actions header blank
- [ ] Status filters use `SegmentedToggle` where applicable
- [ ] 3-dot menus: `dots.svg` 34×34, slate stroke, no hover fill, hover-reveal in tables
- [ ] No new tooltips unless explicitly requested
- [ ] No emojis as icons (Lucide)
- [ ] `cursor-pointer` on clickable elements
- [ ] Hover / focus transitions 150–300ms; focus rings visible
- [ ] Body text `text-slate-700` (not inherited black)
- [ ] User-facing errors are plain language
- [ ] `prefers-reduced-motion` respected
- [ ] Desktop-first; phone only for companion routes
- [ ] Card loading = skeleton / `sm` spinner, not full-page branded spinner

---

## Key file map

| Concern | Path |
|---------|------|
| Style rules (SoT) | `.cursor/rules/global-style-guide.mdc` |
| Table tokens | `src/lib/ui/data-table-styles.ts` |
| Table shell | `src/components/ui/caalm-data-table.tsx` |
| Segmented toggle | `src/components/ui/segmented-toggle.tsx` |
| Status filter adapter | `src/components/StatusUnderlineTabs.tsx` |
| Contract status split pill | `src/components/contracts/ContractLifecycleStatusBadge.tsx` |
| Overflow menu reference | `src/components/ActionDropdown.tsx` |
| Dots icon | `public/assets/icons/dots.svg` |
| Tailwind CAALM colors | `tailwind.config.mjs` |
| CSS utilities | `src/app/globals.css` |
| Inventory | `design-system-inventory.md` |
