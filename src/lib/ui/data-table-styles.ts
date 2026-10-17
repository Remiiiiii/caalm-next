/**
 * Shared glass data-table chrome (roles admin, contracts table, licenses table).
 */
import { cn } from "@/lib/utils";

export const DATA_TABLE_HEADER_CELL =
	"h-auto whitespace-nowrap bg-transparent py-3.5 font-semibold sidebar-gradient-text";

/** Light grey header band — no hover fill (keeps header distinct from body rows) */
export const DATA_TABLE_HEADER_ROW =
	"border-b-0 bg-slate-100/90 shadow-[0_1px_4px_rgba(15,23,42,0.06)] backdrop-blur-md hover:bg-slate-100/90! [&>th]:border-y-2 [&>th]:border-white/40 [&>th:first-child]:rounded-tl-lg [&>th:first-child]:border-l-2 [&>th:last-child]:rounded-tr-lg [&>th:last-child]:border-r-2";

/** Base body row; add e.g. `cursor-pointer` via cn() where needed */
export const DATA_TABLE_BODY_ROW_BASE =
	"border-b-0 transition-all duration-200 hover:bg-white/20 hover:shadow-md [&>td]:border-b [&>td]:border-slate-300/50";

/** Clickable data table rows */
export const DATA_TABLE_BODY_ROW_CLICKABLE = cn(
	DATA_TABLE_BODY_ROW_BASE,
	"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 focus-visible:ring-inset",
);
