/**
 * Shared glass data-table chrome.
 * Canonical look: Assign Tasks table (`TasksDataTable` at `/team/tasks`).
 * Design component: `@/components/ui/caalm-data-table`.
 */
import { cn } from "@/lib/utils";

export const DATA_TABLE_HEADER_CELL =
	"h-auto whitespace-nowrap bg-transparent py-3.5 font-semibold text-slate-700";

/** Light grey header band — no hover fill (keeps header distinct from body rows) */
export const DATA_TABLE_HEADER_ROW =
	"border-b-0 bg-slate-100/90 shadow-[0_1px_4px_rgba(15,23,42,0.06)] backdrop-blur-md hover:bg-slate-100/90! [&>th]:border-y-2 [&>th]:border-white/40 [&>th:first-child]:rounded-tl-lg [&>th:first-child]:border-l-2 [&>th:last-child]:rounded-tr-lg [&>th:last-child]:border-r-2";

/**
 * Horizontal inset of table data inside its card (Assign Tasks). Applied by
 * `CaalmDataTable` itself, so it cannot be overridden per call site.
 */
export const DATA_TABLE_INSET = "px-2 sm:px-4";

/**
 * Same inset for the toolbar above a table (search field, filters) so its left
 * edge lines up with the table data.
 */
export const DATA_TABLE_TOOLBAR_INSET = "px-4";

/** Default body cell padding (Assign Tasks) */
export const DATA_TABLE_CELL = "px-3 py-3 align-middle";

/** First column edge padding */
export const DATA_TABLE_CELL_FIRST = "pl-4 pr-2 py-3 align-middle";

/** Last column edge padding */
export const DATA_TABLE_CELL_LAST = "pl-3 pr-4 py-3 align-middle";

/** Base body row; add e.g. `cursor-pointer` via cn() where needed */
export const DATA_TABLE_BODY_ROW_BASE =
	"border-b-0 transition-all duration-200 hover:bg-white/20 hover:shadow-md [&>td]:border-b [&>td]:border-slate-300/50";

/** Clickable data table rows */
export const DATA_TABLE_BODY_ROW_CLICKABLE = cn(
	DATA_TABLE_BODY_ROW_BASE,
	"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 focus-visible:ring-inset",
);
