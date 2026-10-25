/**
 * CAALM filter / toolbar dropdown triggers.
 * Canonical look: `/team/tasks` filter row (status, priority, assignee, due).
 */

/** Rounded pill trigger for filter bars — height matches .btn-primary (1.65rem) */
export const FILTER_PILL_TRIGGER =
	"inline-flex cursor-pointer items-center gap-2 rounded-full border-[0.25px] border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 [height:1.95rem]";

/** Compact trigger for floating docks / dense toolbars */
export const FILTER_DOCK_TRIGGER =
	"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-700 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

/** @deprecated Prefer FILTER_PILL_TRIGGER */
export const TASK_FILTER_PILL_TRIGGER = FILTER_PILL_TRIGGER;

/** @deprecated Prefer FILTER_DOCK_TRIGGER */
export const TASK_DOCK_TRIGGER = FILTER_DOCK_TRIGGER;
