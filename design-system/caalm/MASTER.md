# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **Product UI source of truth:** `.cursor/rules/global-style-guide.mdc`.
> This Master file is the short CAALM-facing summary for agents and the ui-ux-pro-max skill.
> If anything here disagrees with the style guide, follow the style guide.

---

**Project:** CAALM  
**Updated:** 2026-11-03  
**Category:** Enterprise CLM / analytics dashboard (desktop-first)

---

## Global Rules

### Color Palette

| Role | Hex / token | Usage |
|------|-------------|--------|
| Brand blue | `#0f5384` | Icons, accents, selected text (`text-[#0f5384]`) |
| Teal accent | `#078fab` / `#078FAB` | Meters, secondary accents, dialog icon wells |
| Success green | `green` → `#3DD9B3` | Active / ok pills (`bg-green/10 text-green border-green/20`) |
| Warning orange | `orange` → `#F9AB72` | Pending / draft pills |
| Danger red | `red` → `#FF7474` | Expired / action-required pills |
| Info blue | `blue` → `#56B8FF` | Category / in-progress pills |
| Body text | slate-700 / 600 / 500 | Primary / secondary / muted — never inherited black |
| Borders | `border-slate-200` | Cards, dividers; form fields use `border-slate-300` |

**Hard rule:** CAALM palette wins over any spec, mockup, or PNG CSS. Map layout from the spec; map colors onto CAALM tokens.

### Typography

- **App UI font:** Poppins (`font-poppins` on `<body>`)
- **Do not use** Fira, Inter, or `font-mono` for product UI
- **Page / section / card titles:** `sidebar-gradient-text`
- **Body:** `text-slate-700`; muted helpers `text-slate-500`
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

- Primary page actions: `btn-primary px-3 sm:px-4` + Lucide icon (`h-4 w-4`) + label
- Delete actions: `delete-btn px-3 sm:px-4` + Lucide icon + label
- Do not ship text-only primary actions or plain `variant="destructive"` as the final look

### Data tables

Match the **Assign Tasks** table (`/team/tasks`, `TasksDataTable.tsx`): `CaalmDataTable` + `DATA_TABLE_HEADER_ROW` / `DATA_TABLE_HEADER_CELL` / `DATA_TABLE_BODY_ROW_CLICKABLE` from `@/components/ui/caalm-data-table`. Sortable columns use `SortableDataTableHead`.

### Dropdown menus

Translucent glass (`bg-white/10` + blur) — **never** a card-cap on dropdowns. Nested levels match. Separator above Delete. Overflow: hollow-ring `/assets/icons/dots.svg` + `AppDropdownMenuContent`.

### Avatars

Uploaded profile photo when available; otherwise initials via `@/components/ui/avatar`. Name-only person cells: avatar first; tooltip with full name is allowed **only** on avatar person cells (style-guide exception). Elsewhere: no tooltips unless product asks.

### Inputs

Every standalone text input, select, textarea, and search field must have a **visible** `0.25px solid #CBD5E1` (`border-[0.25px] border-slate-300`) border. Do not use 1px (`border`), white, translucent, or `slate-200` borders on light fills. Search fields in a filter row use `h-10` to match adjacent selects.

### Modals / dialogs

- Overlay: dim + light blur
- Header: brand title color `#0f5384`, white icon well, description muted
- Confirm: `btn-primary`; destructive: `delete-btn`
- Content area: `bg-slate-50` patterns from the style guide

### Overflow menus (3-dot)

Use the Contracts table trigger. Do not use Lucide `MoreVertical`.

- Icon: `/assets/icons/dots.svg` at 34×34
- Trigger classes: `shad-no-focus rounded-full transition-colors hover:bg-white/30`
- Items: `AppDropdownMenuItem` with a Lucide `icon`
- If the menu has Delete or Archive, put `<DropdownMenuSeparator />` immediately **above** that item and use `tone="danger"`

Reference: `src/components/ActionDropdown.tsx`

### Badges / chips

Use the Contracts table badge, not default shadcn Badge variants.

**Shape:**

```tsx
<span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
  {/* optional Lucide icon h-3.5 w-3.5 shrink-0 */}
  Label
</span>
```

| Meaning | Classes |
|---------|---------|
| Active / success | `bg-green/10 text-green border-green/20` |
| Pending / draft | `bg-orange/10 text-orange border-orange/20` |
| Danger / expired | `bg-red/10 text-red border-red/20` |
| Info / category | `bg-blue/10 text-blue border-blue/20` |
| Neutral | `bg-slate-100 text-slate-600 border-slate-200` |

**Rules:**

- No colored dots inside the pill
- Capitalize labels; do not dump raw enums
- Short status labels may use `whitespace-nowrap`
- **Long labels in dense grids** (e.g. “Significant deficiency”): stay inside the column with `max-w-full whitespace-normal break-words leading-snug` and `min-w-0` on the text span; icon `shrink-0`
- Give long-label columns slightly more grid track space when needed
- **No `title=` / hover tooltips on badges** unless product explicitly asks

Reference: `src/components/ContractsTableView.tsx` (`statusBadge`), finding meta chips in `src/components/audit-upload/AuditFindingCard.tsx`

### Meta attribute grids (detail cards)

When a card shows a row of labeled attributes (Severity, Risk, Classification, History, Due):

- Uppercase micro labels: `text-[10px] font-semibold uppercase tracking-wide text-slate-500`
- Desktop column dividers: `border-l border-slate-200/80` with **enough horizontal padding** so chips never touch the divider or the next chip
- Cells: `min-w-0` so flex/grid children can shrink
- Put a light `border-t` above the next major block (e.g. verdict) when that block needs visual separation

### Tooltips (hard rule)

- **Do not** add tooltips (`title=`, Radix Tooltip, hover hint chips) unless the user or product ticket explicitly asks for them
- Exception already in the style guide: avatar person cells may show the full name on hover
- Truncation is not a reason to invent a tooltip — wrap, reflow, or shorten the visible label instead

---

## Style Guidelines

**Style:** Data-dense enterprise dashboard (desktop-first from 1024px)

**Keywords:** Glass cards, KPI / metric cards, data tables, CAALM pills, segment toggles, space-efficient grids

**Best For:** Contract / license lifecycle, audit findings review, org admin, readiness, analytics

**Key Effects:** Row highlight on hover, smooth filter animations, skeletons inside glass cards, page-entrance motion that honors `prefers-reduced-motion`

**Loading spinners (hard rule):** The branded CAALM page-load spinner (`LoadingSpinner` `md` / `lg` / `fullScreen`) is **only** for route transitions, auth gates, and initial/full page loads. Glass cards and card-like panels must use `LoadingSpinner size="sm"` or skeletons — never the large page-load spinner.

### Page Pattern

Authenticated product pages: full-width container `w-full px-4 sm:px-6 lg:px-8 xl:px-12`, glass metric strip + glass table / list, desktop-first (companion routes only on phone). Marketing / landing pages stay responsive under their own page override files.

---

## Anti-Patterns (Do NOT Use)

- ❌ Spec / mockup hex that fights CAALM brand blue / teal / pill tokens
- ❌ Solid white card shells instead of `glass-card` + `glass-card-cap`
- ❌ Default shadcn Badge variants as the final look
- ❌ Tooltips on chips, table cells, or labels unless explicitly requested
- ❌ Truncating long classification / status chips without wrapping when the column has room to wrap
- ❌ Emojis as icons — use Lucide SVG
- ❌ Missing `cursor-pointer` on clickable elements
- ❌ Layout-shifting hover scales
- ❌ Low-contrast or inherited black body text
- ❌ Instant state changes with no 150–300ms transition
- ❌ Invisible focus rings
- ❌ Branded page-load spinner inside glass cards

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] CAALM palette (not mockup CSS) on colors and pills
- [ ] `glass-card` + `glass-card-cap` on page shells / widgets
- [ ] Primary actions use `btn-primary` + Lucide icon; deletes use `delete-btn`
- [ ] Badges use CAALM tint pills; long chips wrap inside `min-w-0` cells
- [ ] No new tooltips unless explicitly requested
- [ ] No emojis as icons (Lucide)
- [ ] `cursor-pointer` on clickable elements
- [ ] Hover / focus transitions 150–300ms; focus rings visible
- [ ] Body text `text-slate-700` (not inherited black)
- [ ] `prefers-reduced-motion` respected
- [ ] Desktop-first; phone only for companion routes
- [ ] Card loading = skeleton / `sm` spinner, not full-page branded spinner
