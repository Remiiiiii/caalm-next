# Template: Dialog or shared UI component

Copy into Agent chat and fill `[brackets]`.

---

**Surface:** [dialog | shared component] — **Name:** [component / dialog title]

**Trigger:** [where it opens from — page, row menu, button]

**Job:** [one sentence — what the user completes]

**Reference:** [e.g. ActionDropdown re-assign dialog, DeleteConfirmationDialog]

**Context first:**
1. Read `dialog-best-practices.mdc` + `global-style-guide.mdc` (and `button-placement.mdc` if actions).
2. Run `graft ask "[similar dialog or component]" --source`.

**Required (dialogs):**
- Cap bar, gradient header, `bg-slate-50` body, footer with primary on the right
- Corner **X** to dismiss; omit footer Cancel unless requested
- Fields: `border-[0.25px] border-slate-300`
- Primary: `btn-primary` + Lucide icon; destructive confirm: `.delete-btn`
- Do **not** invent alternate dialog chrome unless the user explicitly asks

**Required (shared components):**
- Match surrounding CAALM patterns (glass-card, badges, dots.svg overflow menus)
- Desktop-first; no new phone layout for dense admin

**Acceptance:**
- [ ] Matches CAALM dialog/component standards visually
- [ ] Keyboard: focus visible; Escape/X closes when allowed
- [ ] Manual path: [how to open and complete]

**Out of scope:** [full page redesign, unrelated features]
