/**
 * Shared glass data-table chrome (roles admin, contracts table, licenses table).
 */
export const DATA_TABLE_HEADER_CELL =
	"h-auto whitespace-nowrap bg-transparent py-3.5 font-semibold sidebar-gradient-text";

export const DATA_TABLE_HEADER_ROW =
	"border-b-0 bg-transparent shadow-[0_1px_4px_rgba(15,23,42,0.06)] backdrop-blur-md hover:bg-white/20! [&>th]:border-y-2 [&>th]:border-white/30 [&>th:first-child]:rounded-tl-lg [&>th:first-child]:border-l-2 [&>th:last-child]:rounded-tr-lg [&>th:last-child]:border-r-2";

/** Base body row; add e.g. `cursor-pointer` via cn() where needed */
export const DATA_TABLE_BODY_ROW_BASE =
	"border-b-0 transition-all duration-200 hover:bg-white/20 hover:shadow-md [&>td]:border-b [&>td]:border-slate-300/50";
