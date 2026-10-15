# Template: New or redesigned app page

---

**Page:** `[route]` — **Title:** [H1 text]

**Reference pages:** [e.g. contracts, licenses, settings — match width and header pattern]

**Before coding:**
1. Read `global-style-guide.mdc` and run ui-ux-pro-max skill if layout is non-trivial.
2. `graft ask "page [feature]" --source` for similar pages.

**Required structure:**
- Container: `w-full px-4 sm:px-6 lg:px-8 xl:px-12` — no page-level `max-w-*`
- Header: `h1 capitalize sidebar-gradient-text`
- Cards: `glass-card` + `glass-card-cap`
- Fields: `border-[0.25px] border-slate-300`
- Primary actions: `btn-primary` + Lucide icon, right-aligned

**Data density:** tables use `PageIndex`; overflow menus use dots.svg pattern.

**Verify:** desktop 1024px+; companion route only if explicitly in scope.
