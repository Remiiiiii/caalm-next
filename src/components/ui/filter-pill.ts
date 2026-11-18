/**
 * CAALM filter / toolbar dropdown triggers.
 * Canonical look: `/team/tasks` filter row (status, priority, assignee, due).
 */

/**
 * Rounded pill trigger for filter bars — forced to 1.55rem.
 * Uses `h-[1.55rem]!` (Tailwind's important suffix), not `[height:1.65rem]` —
 * a bare arbitrary-property declaration doesn't register in the same
 * tailwind-merge conflict group as `h-*`, so when a host component (e.g.
 * shadcn's SelectTrigger, which hardcodes `h-10`) appends its own height
 * utility after this one, `h-10` silently wins. `!` guarantees this wins
 * regardless of class order or which component applies it to.
 */
export const FILTER_PILL_TRIGGER =
	"inline-flex h-[1.65rem]! cursor-pointer items-center gap-2 rounded-full border-[0.25px] border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

/** Compact trigger for floating docks / dense toolbars */
export const FILTER_DOCK_TRIGGER =
	"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-700 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

/** @deprecated Prefer FILTER_PILL_TRIGGER */
export const TASK_FILTER_PILL_TRIGGER = FILTER_PILL_TRIGGER;

/** @deprecated Prefer FILTER_DOCK_TRIGGER */
export const TASK_DOCK_TRIGGER = FILTER_DOCK_TRIGGER;
