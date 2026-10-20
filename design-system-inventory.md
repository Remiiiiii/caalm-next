# CAALM design system inventory

Inventory of what exists in this repo as of the inspection date. Paths are repo-relative. Nothing here is invented: if a feature (for example a typed column-definition API, named z-index tokens, or a dedicated spacing token set) is missing, that is stated explicitly.

**Primary product UI sources of truth**

| Role | Path |
|------|------|
| Style / contribution rules for UI | `.cursor/rules/global-style-guide.mdc` |
| Desktop-first product policy | `.cursor/rules/desktop-first.mdc` |
| Agent workflow (UI rule map) | `.cursor/rules/agent-workflow-principal.mdc`, `CLAUDE.md`, `AGENTS.md` |
| Implemented CSS utilities + CSS variables | `src/app/globals.css` |
| Tailwind theme extensions | `tailwind.config.ts`, `tailwind.config.mjs` (identical theme; `globals.css` `@config` points at `.mjs`) |
| Shared UI primitives | `src/components/ui/*` |
| Data-table chrome tokens | `src/lib/ui/data-table-styles.ts`, `src/components/ui/caalm-data-table.tsx` |
| Generated / secondary design notes | `design-system/caalm/MASTER.md` (and page overrides under `design-system/caalm/pages/`) |

> Note: `design-system/caalm/MASTER.md` contains a **generated** palette (Fira fonts, amber CTA `#F59E0B`, etc.) that does **not** match the implemented product tokens below. Product UI follows `global-style-guide.mdc` + `globals.css` + `tailwind.config.*`. This inventory records both.

---

## 1. Stack and architecture rules

### Framework and language

- **Framework:** Next.js (`next` `^16.3.5` in `package.json`), App Router under `src/app/`.
- **Language:** TypeScript / TSX.
- **Package manager:** `pnpm` (`packageManager`: `pnpm@11.23.0`).
- **UI kit base:** shadcn/ui “new-york” style (`components.json`), Radix primitives, `class-variance-authority`, `clsx` / `cn` (`src/lib/utils`).
- **Styling approach:** Tailwind CSS v4 via `@import "tailwindcss"` in `src/app/globals.css`, plus `@layer` utilities and plain CSS classes. **Not** CSS Modules or styled-components for the product shell.
- **Font loading:** `next/font/google` Poppins in `src/app/layout.tsx` (`--font-poppins`, `font-poppins` on `<body>`).
- **Backend / data (context only):** Appwrite; not part of the visual design system.

### Folder conventions

| Area | Path |
|------|------|
| App routes | `src/app/` (`(root)` = authenticated shell) |
| Shared UI (shadcn + CAALM) | `src/components/ui/` |
| Feature components | `src/components/<domain>/` |
| Domain logic | `src/lib/<domain>/` |
| Design docs | `design-system/caalm/` |
| Cursor UI rules | `.cursor/rules/global-style-guide.mdc` |

Naming for UI files under `src/components/ui/` is mostly kebab-case (`search-field.tsx`, `caalm-data-table.tsx`) with some PascalCase exceptions (`CaalmFilterSelect.tsx`, `DropdownScrollArea.tsx`, `DesktopRequiredScreen.tsx`).

### Lint / format / contribution rules that affect UI

**ESLint** — `eslint.config.mjs` (Next core-web-vitals; softens several React Hooks / Next rules to `warn`; turns off `@next/next/no-img-element`).

**Biome** — `biome.json` (formatter: tabs; many a11y rules off including `useKeyWithClickEvents`, `noStaticElementInteractions`).

**Scripts** (`package.json`): `pnpm lint`, `pnpm lint-check` / `lint-format` (Biome).

**Quoted rules (UI-relevant excerpts):**

From `.cursor/rules/global-style-guide.mdc`:

> This is the **single source of truth** for all styling, page structure, and component patterns in the application.

> **ALWAYS** use the standard container wrapper: `w-full px-4 sm:px-6 lg:px-8 xl:px-12`

> When creating or redesigning **any** card / page surface / table shell / widget container: use `className="glass-card"` … Place `<div className="glass-card-cap" />` … Do **not** invent a flat white card.

> Primary / create / save → `className="btn-primary px-3 sm:px-4"` … Delete → `className="delete-btn px-3 sm:px-4"` … **ALWAYS** include a Lucide icon.

> Every list / data table … must use the **Assign Tasks** chrome … `@/components/ui/caalm-data-table`.

From `.cursor/rules/desktop-first.mdc`:

> The authenticated product is **desktop-primary**. Full UI starts at **1024px** (`DESKTOP_MIN_WIDTH` in `src/lib/ui/desktop-first.ts`).

From `CLAUDE.md` / agent rule map:

> `| .cursor/rules/global-style-guide.mdc | Any UI/UX work: styling, page structure, components (*.tsx, *.css) |`

From `.cursor/skills/ui-ux-pro-max/SKILL.md` (CAALM hard rules section):

> Source of truth: `.cursor/rules/global-style-guide.mdc` and `design-system/caalm/MASTER.md`.

---

## 2. Design tokens

### 2.1 Colors — Tailwind custom palette

**File:** `tailwind.config.ts` / `tailwind.config.mjs`

| Token | Value | Role group |
|-------|-------|------------|
| `brand.100` | `#EA6365` | accent / brand |
| `brand` (DEFAULT) | `#FA7275` | accent / brand |
| `red` | `#FF7474` | danger |
| `error` | `#b80000` | danger |
| `green` | `#3DD9B3` | success |
| `blue` | `#56B8FF` | accent / info |
| `pink` | `#EEA8FD` | accent |
| `orange` | `#F9AB72` | warning |
| `coral.500` | `#FF6B6B` | danger / accent |
| `coral.600` | `#FF5252` | danger / accent |
| `light.100` | `#333F4E` | text |
| `light.200` | `#A3B2C7` | text / muted |
| `light.300` | `#F2F5F9` | surface |
| `light.400` | `#F2F4F8` | surface |
| `dark.100` | `#04050C` | surface / text |
| `dark.200` | `#131524` | surface |
| `navy` | `#1e293b` | text |

Semantic shadcn bridges (same files): `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart.1`–`chart.5` → `hsl(var(--…))`.

### 2.2 Colors — CSS variables (light + dark)

**File:** `src/app/globals.css` (`:root` and `.dark`)

Values are HSL components (no `hsl()` wrapper in the variable).

| Token | Light (`:root`) | Dark (`.dark`) | Role group |
|-------|-----------------|----------------|------------|
| `--background` | `0 0% 100%` | `0 0% 3.9%` | surface |
| `--foreground` | `0 0% 3.9%` | `0 0% 98%` | text |
| `--card` | `0 0% 100%` | `0 0% 3.9%` | surface |
| `--card-foreground` | `0 0% 3.9%` | `0 0% 98%` | text |
| `--popover` | `0 0% 100%` | `0 0% 3.9%` | surface |
| `--popover-foreground` | `0 0% 3.9%` | `0 0% 98%` | text |
| `--primary` | `0 0% 9%` | `0 0% 98%` | text / accent (shadcn default) |
| `--primary-foreground` | `0 0% 98%` | `0 0% 9%` | text |
| `--secondary` | `0 0% 96.1%` | `0 0% 14.9%` | surface |
| `--secondary-foreground` | `0 0% 9%` | `0 0% 98%` | text |
| `--muted` | `0 0% 96.1%` | `0 0% 14.9%` | surface |
| `--muted-foreground` | `0 0% 45.1%` | `0 0% 63.9%` | text |
| `--accent` | `0 0% 96.1%` | `0 0% 14.9%` | surface / accent |
| `--accent-foreground` | `0 0% 9%` | `0 0% 98%` | text |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | danger |
| `--destructive-foreground` | `0 0% 98%` | `0 0% 98%` | text |
| `--border` | `0 0% 89.8%` | `0 0% 14.9%` | border |
| `--input` | `0 0% 89.8%` | `0 0% 14.9%` | border |
| `--ring` | `190 92% 35%` (`#078FAB` comment) | `0 0% 83.1%` | accent / focus |
| `--chart-1` … `--chart-5` | see file lines 59–63 | see file lines 86–90 | accent / chart |
| `--radius` | `0.5rem` | (inherited; not redefined in `.dark`) | radius |

`darkMode: "class"` is set in Tailwind config. Authenticated product UI is predominantly light; docs UI has an explicit theme toggle (`src/components/docs/DocsTheme.tsx`).

### 2.3 Colors — product brand / role conventions (documented + used in CSS)

**File:** `.cursor/rules/global-style-guide.mdc` (Color Palette / Badges) and `src/app/globals.css`

| Role | Documented / implemented values | Source |
|------|----------------------------------|--------|
| Brand blue (icons, accents) | `#0f5384` | style guide; hard-coded in many components |
| Sidebar / heading gradient text | `#12477d` → `#03afbf` | `.sidebar-gradient-text` in `globals.css` |
| Primary button gradient | `#00c1cb` → `#078fab` → `#0e638f` → `#11487d` → `#162768` | `.btn-primary` / `.primary-btn` in `globals.css` |
| Delete button | `border-red/30`, `bg-red/10`, `text-red` | `.delete-btn` in `globals.css` |
| Success badge | `bg-green/10 text-green border-green/20` | style guide |
| Warning badge | `bg-orange/10 text-orange border-orange/20` | style guide |
| Danger badge | `bg-red/10 text-red border-red/20` | style guide |
| Info badge | `bg-blue/10 text-blue border-blue/20` | style guide |
| Neutral badge | `bg-slate-100 text-slate-600 border-slate-200` | style guide |
| Text primary / secondary / muted | `text-slate-700` / `600` / `500` | style guide |
| Borders (cards) | `border-slate-200` | style guide |
| Borders (fields) | `border-slate-300` (`#cbd5e1`), width `0.25px` | style guide + components |
| Focus teal | `#078FAB` | style guide / `--ring` comment |
| Glass fill | `rgba(255,255,255,0.55)` | `.glass-card` in `globals.css` |
| Glass border | `1px solid rgba(255,255,255,0.5)` | `.glass-card` |
| Cap bar | `#d6d7d8` @ opacity `0.7` | `.glass-card-cap` |
| Main content surface | `#f0eded` + overlay image | `.main-content` in `globals.css` |
| Badge emerald (misc) | `--badge-emerald: #00c1cb` | `globals.css` ~2494 |

### 2.4 Typography

| Token / class | Value | File |
|---------------|-------|------|
| Font family `poppins` | `["var(--font-poppins)"]` | `tailwind.config.*` |
| `--font-poppins` | Poppins 400/500/600/700 via `next/font` | `src/app/layout.tsx` |
| `.h1` | 24/32 bold → sm 28/36 → lg 34/42 | `globals.css` |
| `.h2` | 20/28 bold → sm 24/36 | `globals.css` |
| `.h3` | 18/26 semibold → sm 20/28 | `globals.css` |
| `.h4` | 18/20 medium | `globals.css` |
| `.h5` | 16/24 semibold | `globals.css` |
| `.subtitle-1` | 16/24 medium | `globals.css` |
| `.subtitle-2` | 14/20 semibold | `globals.css` |
| `.body-1` | 16/24 regular, `rgb(51 65 85)` | `globals.css` |
| `.body-2` | 14/20 regular, `rgb(51 65 85)` | `globals.css` |
| `.button` | 14/20 medium | `globals.css` |
| `.caption` | 12/16 regular | `globals.css` |
| `.overline` | 10/14 regular | `globals.css` |

Style guide page title pattern: `h1 capitalize sidebar-gradient-text`.

### 2.5 Spacing

**No custom `theme.extend.spacing` tokens** exist in `tailwind.config.*`. Spacing uses default Tailwind scale plus documented conventions:

| Convention | Value | Source |
|------------|-------|--------|
| Page container padding | `px-4 sm:px-6 lg:px-8 xl:px-12` | style guide |
| Card content padding | `p-4 sm:p-6` | style guide |
| Stat / content grid gap | `gap-6` | style guide |
| Section margins | `mb-4` (header), `mb-6` (actions / grids) | style guide |
| Dialog padding | `p-6`, header `py-4 px-6`, footer `px-6 py-4` | style guide |
| `.main-content` padding | `px-4 py-6 sm:px-6 sm:py-7 md:px-8 md:py-9 lg:px-2 lg:py-10` | `globals.css` |
| `.container` helper | `mx-auto max-w-7xl px-5` | `globals.css` |

`design-system/caalm/MASTER.md` also lists `--space-xs` … `--space-3xl` (4px–64px). Those CSS variables are **not** defined in `globals.css` or Tailwind config.

### 2.6 Radius

| Token | Value | File |
|-------|-------|------|
| `--radius` | `0.5rem` | `globals.css` |
| `borderRadius.lg` | `var(--radius)` | `tailwind.config.*` |
| `borderRadius.md` | `calc(var(--radius) - 2px)` | `tailwind.config.*` |
| `borderRadius.sm` | `calc(var(--radius) - 4px)` | `tailwind.config.*` |
| Glass card | `rounded-lg` (utility) | `.glass-card` |
| Frosted glass | `border-radius: 1.5rem` | `.glass-card-frosted` |
| Primary / delete buttons | `rounded-full` | `.btn-primary`, `.delete-btn` |
| Main content (lg+) | `rounded-[30px]` | `.main-content` media query |

### 2.7 Shadows

| Token | Value | File |
|-------|-------|------|
| `drop-1` | `0px 10px 30px 0px rgba(66, 71, 97, 0.1)` | `tailwind.config.*` |
| `drop-2` | `0 8px 30px 0 rgba(65, 89, 214, 0.3)` | `tailwind.config.*` |
| `drop-3` | `0 8px 30px 0 rgba(65, 89, 214, 0.1)` | `tailwind.config.*` |
| Glass card | `0 8px 32px 0 rgba(31, 38, 135, 0.15)` | `.glass-card` |
| Interactive glass hover | `0 12px 40px 0 rgba(31, 38, 135, 0.2)` | `.interactive-glass-card:hover` |
| Toast glass | `0 10px 36px 0 rgba(31, 38, 135, 0.22)` | `.toast-glass.glass-card` |
| Data table header | `shadow-[0_1px_4px_rgba(15,23,42,0.06)]` | `DATA_TABLE_HEADER_ROW` |

`MASTER.md` lists generic `--shadow-sm/md/lg/xl`; those are **not** present as CSS variables in `globals.css`.

### 2.8 Borders (token-like utilities)

| Name / pattern | Value | File |
|----------------|-------|------|
| Field border | `0.25px solid` + `border-slate-300` | style guide; `SearchField`, filter pills |
| Glass card border | `1px solid rgba(255,255,255,0.5)` | `globals.css` |
| Dropdown glass border | `border-white/30` | `dropdown-menu.tsx` `GLASS_DROPDOWN_PANEL` |
| Form focus | `#078FAB` | style guide |

### 2.9 Z-index

**No named z-index tokens** in Tailwind `theme.extend` or as `--z-*` CSS variables.

Hard-coded usages found:

| Usage | Value | File |
|-------|-------|------|
| Drawer / sheet overlay & content | `z-50` | `drawer.tsx`, `sheet.tsx` |
| Toast viewport | `z-10002` | `toast.tsx` |
| Segmented toggle thumb / tabs | `z-10` (local stacking) | `segmented-toggle.tsx` |
| Wave background | `-z-10` | `(root)/layout.tsx` |
| Misc in `globals.css` | `z-index: 0`, `1`, `2`, `30` | various rules |

### 2.10 Breakpoint extensions

| Token | Value | File |
|-------|-------|------|
| `3xl` | `1920px` | `tailwind.config.*` |
| `4xl` | `2560px` | `tailwind.config.*` |
| Desktop product minimum | `1024` (`DESKTOP_MIN_WIDTH`) | `src/lib/ui/desktop-first.ts` |

---

## 3. Component inventory (shared UI)

Focus: the components named in the request. Many more shadcn primitives live under `src/components/ui/` (see directory listing in repo).

### Card

- **Path:** `src/components/ui/card.tsx`
- **Exports:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `glassCardClasses`
- **Props:** standard `HTMLAttributes<HTMLDivElement>` (forwarded refs)
- **Variants / classes:** `glassCardClasses.static` (`glass-card`), `.interactive` (`glass-card interactive-glass-card`), `.cap`, `.inner`, `.frosted`
- **Usage:**

```tsx
<Card className="glass-card">
  <div className="glass-card-cap" />
  <CardContent className="p-4 sm:p-6">{/* … */}</CardContent>
</Card>
```

### Button

- **Path:** `src/components/ui/button.tsx`
- **Props:** `ButtonProps` = button HTML attrs + `variant` + `size` + `asChild?`
- **Variants:** `default` | `destructive` | `outline` | `secondary` | `ghost` | `link`
- **Sizes:** `default` | `sm` | `lg` | `icon`
- **Product CTAs (CSS, not CVA):** `.btn-primary` / `.primary-btn`, `.delete-btn` / `.btn-delete` in `globals.css`
- **Usage:**

```tsx
<Button className="btn-primary px-3 sm:px-4">
  <Plus className="h-4 w-4" />
  Add
</Button>
```

### Badge / chip

- **Path:** `src/components/ui/badge.tsx`
- **Props:** `BadgeProps` = div HTML attrs + `variant`
- **CVA variants:** `default` | `secondary` | `destructive` | `outline`
- **Product rule:** style guide requires CAALM pill classes (often a plain `<span>`), not default shadcn variants as the final look
- **Usage (product pattern):**

```tsx
<span className="inline-block px-2 py-0.5 text-xs rounded-full border bg-green/10 text-green border-green/20">
  Active
</span>
```

### Tabs

- **Path:** `src/components/ui/tabs.tsx`
- **Exports:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (Radix)
- **Props:** Radix `Tabs` primitive props; styled list uses frosted white track
- **Usage:**

```tsx
<Tabs defaultValue="one">
  <TabsList>
    <TabsTrigger value="one">One</TabsTrigger>
  </TabsList>
  <TabsContent value="one">…</TabsContent>
</Tabs>
```

### Segmented toggle

- **Path:** `src/components/ui/segmented-toggle.tsx`
- **Props:** `value`, `onChange`, `tabs: SegmentedToggleTab[]`, `ariaLabel`, `className?`
- **Tab shape:** `{ value, label, icon?, iconClassName?, hideLabel?, ariaLabel?, count?, countClassName? }`
- **Variants:** sliding white thumb; selected `text-[#0f5384]`
- **Usage:**

```tsx
<SegmentedToggle
  ariaLabel="View"
  value={view}
  onChange={setView}
  tabs={[
    { value: "list", label: "List" },
    { value: "board", label: "Board" },
  ]}
/>
```

### Search input

- **Path:** `src/components/ui/search-field.tsx`
- **Props:** `SearchFieldProps` = `Input` props minus `type`, plus `containerClassName?`
- **Variants:** single canonical search field (`h-10`, leading Lucide `Search`)
- **Usage:**

```tsx
<SearchField
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Search contracts..."
/>
```

### Dropdown

- **Path:** `src/components/ui/dropdown-menu.tsx`
- **Key exports:** Radix menu primitives + `AppDropdownMenuContent`, `AppDropdownMenuItem`, `AppDropdownMenuTrigger`, `AppDropdownMenuCheckboxItem`, `DROPDOWN_ITEM_LABEL_CLASS`
- **`AppDropdownMenuItem` props:** Radix item props + required `icon: LucideIcon`, optional `tone?: "default" | "danger" | "info" | "success" | "warning"`, `iconClassName?`
- **Panel:** glass (`bg-white/10` + blur) — **no** card-cap
- **Related:** `DropdownScrollArea` (`src/components/ui/DropdownScrollArea.tsx`), filter pills (`filter-pill.ts`, `CaalmFilterSelect.tsx`)
- **Usage:**

```tsx
<AppDropdownMenuContent align="end">
  <AppDropdownMenuItem icon={Pencil} onClick={…}>Edit</AppDropdownMenuItem>
  <DropdownMenuSeparator />
  <AppDropdownMenuItem icon={Trash2} tone="danger" onClick={…}>Delete</AppDropdownMenuItem>
</AppDropdownMenuContent>
```

### Drawer

- **Path:** `src/components/ui/drawer.tsx` (vaul)
- **Exports:** `Drawer`, `DrawerTrigger`, `DrawerPortal`, `DrawerClose`, `DrawerOverlay`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, …
- **Props:** vaul `Root` props (`shouldScaleBackground` default `true`); content/overlay are Radix-style forwarded props
- **Note:** product “side panels” often use **Sheet** (`sheet.tsx`) instead
- **Usage:**

```tsx
<Drawer>
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader><DrawerTitle>Title</DrawerTitle></DrawerHeader>
  </DrawerContent>
</Drawer>
```

### Sheet (side panel; related)

- **Path:** `src/components/ui/sheet.tsx`
- **`SheetContent` extras:** `side?: "top" | "bottom" | "left" | "right"` (default `right`), `showOverlay?`, `showCloseButton?`

### Toast

- **Radix toast:** `src/components/ui/toast.tsx`, `toaster.tsx`, `use-toast.ts`
  - **Variants:** `default` (glass + cap), `destructive`
  - Viewport: `z-10002`
- **Sonner:** `src/components/ui/sonner.tsx` exports `Toaster`, `toast` (theme via `next-themes`)
- **App shell uses:** `@/components/ui/toaster` in `src/app/(root)/layout.tsx`
- **Usage (Radix hook pattern):** `useToast()` from `use-toast.ts` (see file for API)

### Global table

- **Design component:** `src/components/ui/caalm-data-table.tsx`
- **Style tokens:** `src/lib/ui/data-table-styles.ts`
- **Primitives:** `src/components/ui/table.tsx` (`Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, …)
- See **§4** for full API detail.

### Page header

- **No dedicated `PageHeader` component file.** Pattern is documented in `.cursor/rules/global-style-guide.mdc` and applied inline on pages.
- **Shell chrome:** `DashboardHeader` (`src/components/DashboardHeader.tsx`) in `(root)/layout.tsx`
- **Pattern:**

```tsx
<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
  <h1 className="h1 capitalize sidebar-gradient-text">Page Title</h1>
</div>
```

### Chart wrappers

- **Path:** `src/components/ui/chart.tsx`
- **Exports:** `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`
- **Props (`ChartContainer`):** `config: ChartConfig`, `children` (Recharts), plus div props; wraps `ResponsiveContainer`
- **`ChartConfig`:** map of keys → `{ label?, icon? }` and either `{ color }` or `{ theme: { light, dark } }`
- **Usage example:** `src/components/StorageUsagePieChart.tsx` (`ChartContainer` + `PieChart` / `Pie` / `Cell`)

### Metric / stat card (related)

- **Path:** `src/components/ui/metric-stat-card.tsx`
- **Props (`MetricStatCardProps`):** `title`, `value`, `description?`, `footer?`, `icon`, tones (`iconTone`, `titleTone`, `borderTone`, `valueTone`, `dynamicTone`), `interactive?`, `onClick?`, `headerHref?`, `backdrop?: "dots" | "radial" | "wave" | "none"`, …
- **Icon chrome:** `src/components/ui/stat-card-icon.tsx` (`tone?: "default" | "warning" | "danger" | "success"`)

### Pagination (page index)

- **Path:** `src/components/ui/page-index.tsx`
- **Props:** `page`, `onPageChange`, `totalPages?` or `totalItems?` + `pageSize?`, `summary?`, `showRange?`, `itemLabel?`, `hideWhenSinglePage?`, `scrollToTop?`, …

### Filter select

- **Path:** `src/components/ui/CaalmFilterSelect.tsx`
- **Props:** `value`, `options`, `onChange`, `ariaLabel`, `triggerLabel?`, `icon?`, `variant?: "filter" | "dock"`, controlled `open?` / `onOpenChange?`

---

## 4. Global table API (detail)

**There is no typed column-definition schema** (no `@tanstack/react-table` `ColumnDef` API in the shared module). Tables compose:

1. Shell: `CaalmDataTable`
2. Header/body class tokens: `DATA_TABLE_*`
3. Domain JSX columns in feature files (canonical: `src/components/tasks/TasksDataTable.tsx`)

### Shell and helpers (`caalm-data-table.tsx`)

| Export | Props | Behavior |
|--------|-------|----------|
| `CaalmDataTable` | `children`, `className?` | `overflow-x-auto` wrapper + `<Table className="border-separate border-spacing-0">` |
| `CaalmDataTableEmpty` | `title`, `description?`, `className?` | Centered empty message |
| `CaalmDataTableSkeleton` | `columns?` (default 8), `rows?` (default 6), `className?` | Skeleton header + body rows (`role="status"`) |
| `SortableDataTableHead` | `label`, `onClick`, `active?`, `className?` | Ghost button + `ChevronsUpDown`; active icon uses brand `#0f5384` |

Re-exports all `DATA_TABLE_*` constants from `data-table-styles.ts`.

### Style tokens (`data-table-styles.ts`)

| Constant | Purpose |
|----------|---------|
| `DATA_TABLE_HEADER_CELL` | Header cell typography (`sidebar-gradient-text`) |
| `DATA_TABLE_HEADER_ROW` | Light grey frosted header band |
| `DATA_TABLE_CELL` / `_FIRST` / `_LAST` | Body cell padding |
| `DATA_TABLE_BODY_ROW_BASE` | Hover glass row |
| `DATA_TABLE_BODY_ROW_CLICKABLE` | Base + `cursor-pointer` + focus ring |

### Column definition shape

**Not centralized.** Consumers hard-code `<TableHead>` / `<TableCell>` children. Example sort keys in Assign Tasks are local types:

```ts
type SortKey = "title" | "priority" | "dueDate";
type SortDir = "asc" | "desc";
```

(`TasksDataTable.tsx`)

### Sorting

- Shared UI: `SortableDataTableHead` only toggles via caller-supplied `onClick` / `active`.
- Sorting logic lives in the feature component (`toggleSort` + `useMemo` sort in `TasksDataTable.tsx`).
- No built-in multi-sort or server-sort API on `CaalmDataTable`.

### Row click

- Apply `DATA_TABLE_BODY_ROW_CLICKABLE` and attach `onClick` / keyboard handlers in the feature table.
- Example: `onOpen(task)` in `TasksDataTable`.

### Selection

- **Not part of `CaalmDataTable`.** Assign Tasks implements selection with `Checkbox`, `selectedIds: Set<string>`, `onToggle`, `onToggleAll` in `TasksDataTable.tsx`.
- Base `TableRow` from `table.tsx` includes `data-[state=selected]:bg-muted` for optional Radix-style state.

### Footer / summary row

- Primitive: `TableFooter` exists in `src/components/ui/table.tsx` (`border-t bg-muted/50 font-medium`).
- **CAALM design tokens do not define a summary-row chrome.** No usage of a shared footer helper in `caalm-data-table.tsx`.
- List pagination / “Showing x–y of z” is handled by `PageIndex` (`page-index.tsx`), not by the table shell.

### Empty state

- `CaalmDataTableEmpty` or early-return in the feature table (Tasks returns empty component when `tasks.length === 0`).

### Loading state

- `CaalmDataTableSkeleton` inside a glass card — style guide forbids branded `LoadingSpinner` inside table cards.

### Primitive table API (`table.tsx`)

Standard HTML wrappers: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` — all `HTMLAttributes` / appropriate cell attrs; no CAALM-specific props.

---

## 5. Layout

### Page shell (authenticated)

**File:** `src/app/(root)/layout.tsx`

Structure:

1. Providers: `AuthProvider` → `OrganizationProvider` → `StepUpProvider` → `ImpersonationProvider`
2. `SidebarProvider`
3. Full-viewport `main` with `WaveLoopBackground` (`fixed inset-0 -z-10`)
4. `ImpersonationBanner`
5. Flex row: `Sidebar` + section (`MobileNavigation`, `DashboardHeader`, `.main-content` with `DesktopFirstGate` around page children)
6. `Toaster`, `DemoTourLayer`, `ReportIssueFab`

**`.main-content`** (`globals.css`): scrollable content pane, background `#f0eded` + image overlay; at `min-width: 1024px` gets `rounded-[30px] mr-7 mb-7`.

### Page container (inside content)

Style guide / checklist:

```tsx
<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
  {/* page */}
</div>
```

No page-level `max-w-*` on the outer wrapper for full app pages.

### Grid / breakpoints

- Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536) plus `3xl` 1920, `4xl` 2560.
- Stat cards example: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- Desktop gate: `DESKTOP_MIN_WIDTH = 1024`; companion routes listed in `src/lib/ui/desktop-first.ts`.

### Spacing scale

Default Tailwind spacing + conventions in §2.5. No project-owned `--space-*` CSS variables in the implemented stylesheet.

---

## 6. Icons and charts

### Icons

| Library | Package | Declared use |
|---------|---------|--------------|
| **Lucide** (primary) | `lucide-react` | `components.json` `"iconLibrary": "lucide"`; style guide / buttons / tables |
| Heroicons | `@heroicons/react` | Present in dependencies; not the documented product default |
| Custom SVG | e.g. `/assets/icons/dots.svg` | Required for 3-dot overflow menus (style guide) |

Typical sizes from style guide: headers `w-5 h-5`, buttons `h-4 w-4`, small `h-3 w-3`.

### Charts

| Piece | Path / package |
|-------|----------------|
| Library | `recharts` (`^3.7.0`) |
| Shared wrapper | `src/components/ui/chart.tsx` (`ChartContainer` + tooltip/legend helpers) |
| Build pattern | `ChartContainer config={…}` → Recharts chart (`PieChart`, `BarChart`, `LineChart`, etc.) as children of `ResponsiveContainer` (inside container) |
| Example | `src/components/StorageUsagePieChart.tsx` |
| Other consumers (non-exhaustive) | `src/components/audits/AuditDomainCharts.tsx`, `src/components/dashboard/RiskTrackingChart.tsx`, `src/components/analytics/*`, `src/components/Chart.tsx`, analytics pages under `src/app/(root)/analytics/` |

Some charts import Recharts primitives directly without `ChartContainer`; both patterns exist.

---

## 7. Other shared UI files (index only)

Present under `src/components/ui/` (complete set as of inspection): accordion, alert, alert-dialog, aspect-ratio, avatar, breadcrumb, button, calendar, card, carousel, caalm-data-table, caalm-date-picker, CaalmFilterSelect, chart, checkbox, collapsible, command, context-menu, currency-amount-input, currency-select, DesktopRequiredScreen, dialog, drawer, dropdown-menu, DropdownScrollArea, filter-pill, form, hover-card, input, input-otp, label, loading, mail-clock-icon, menubar, metric-stat-card, navigation-menu, NotificationIcon, page-index, pagination, popover, progress, radio-group, resizable, sample-data-badge, scroll-area, search-field, select, select-scrollable, segmented-toggle, separator, sheet, sidebar, skeleton, skeletons, slider, sonner, stat-card-icon, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip, usd-conversion-hint, use-toast, widget-carousel, delete-confirmation-dialog, badge.

---

## 8. `design-system/caalm/MASTER.md` (secondary / generated)

Exists at `design-system/caalm/MASTER.md` with page overrides:

- `design-system/caalm/pages/billing.md`
- `design-system/caalm/pages/analytics.md`
- `design-system/caalm/pages/landing.md`
- `design-system/caalm/pages/executive-dashboard.md`

Generated global palette in MASTER (for record only; **not** wired into Tailwind/`globals.css`):

| Role | Hex (MASTER) |
|------|----------------|
| Primary | `#1E40AF` |
| Secondary | `#3B82F6` |
| CTA/Accent | `#F59E0B` |
| Background | `#F8FAFC` |
| Text | `#1E3A8A` |

Fonts listed there: Fira Code / Fira Sans. Implemented app font is **Poppins**.

MASTER does align with product on glass cards, `CaalmDataTable`, `btn-primary` / `delete-btn`, glass dropdowns, badges, and overflow `dots.svg` in later sections of that file.
