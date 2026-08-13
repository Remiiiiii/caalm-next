# UI/UX check

Run this checklist against the page or components you changed.

## Glass and brand

- [ ] Cards use `glass-card` with `glass-card-cap` (blur + shadow kept)
- [ ] Clickable cards also use `interactive-glass-card`
- [ ] Body text is `text-slate-700` / muted `text-slate-600` (readable on glass)
- [ ] Brand blue `#0f5384` and Poppins unchanged (no indigo/Fira swap)

## Interaction

- [ ] Clickable elements have `cursor-pointer`
- [ ] Hover uses color/border/shadow only — no layout-shifting `scale-*`
- [ ] Transitions are `duration-200` (150–300ms)
- [ ] Focus visible: `focus-visible:ring-*` on buttons, cards, table rows

## Icons and feedback

- [ ] No emoji used as UI icons (Lucide only)
- [ ] Empty/error states: Lucide icon + short message
- [ ] Loading uses skeletons where practical

## Layout

- [ ] Page container: `w-full px-4 sm:px-6 lg:px-8 xl:px-12`
- [ ] Stat grids: `gap-6` (not `gap-4`)
- [ ] Stat cards: content in `CardContent` only (no `CardHeader` on metrics)
- [ ] Responsive: check 375px, 768px, 1024px, 1440px — no horizontal scroll

## Motion and a11y

- [ ] `prefers-reduced-motion` respected for decorative animation
- [ ] Keyboard focus order matches visual order
- [ ] Images have meaningful `alt` (or `aria-hidden` if decorative)

## References

- [`design-system/caalm/MASTER.md`](../../design-system/caalm/MASTER.md)
- [`.cursor/rules/global-style-guide.mdc`](../rules/global-style-guide.mdc)
