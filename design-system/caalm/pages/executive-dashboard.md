# Executive Dashboard — page overrides

> Overrides [`MASTER.md`](../MASTER.md) for `ExecutiveDashboard.tsx`.

## Layout

- Stat grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6`
- Widget rows: `gap-6` between major sections
- Action buttons: separate row, `mb-6 flex justify-end`

## Widgets

- Clickable stat/widget cards: add `interactive-glass-card`
- Calendar and news widgets: static `glass-card` unless entire card navigates

## Density

- Collapse secondary file actions into dropdowns where possible
- Error/empty states: Lucide icon + one line of text
