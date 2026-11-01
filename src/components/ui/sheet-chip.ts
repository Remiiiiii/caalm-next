/**
 * CAALM sheet chip — selectable / suggestion pills inside assistant & panel sheets.
 * Canonical look: Ask Next suggestions (`ReadinessAiPanel`), quick prompts and
 * feedback reason chips (`CaalmAssistantSheet`).
 */

/** Idle (unselected) chip — hover previews the selected-blue affordance. */
export const SHEET_CHIP_IDLE =
	"cursor-pointer rounded-full border border-slate-200 bg-white/50 px-3 py-1.5 text-xs text-slate-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

/** Selected / active chip (multi-select chip groups, e.g. feedback reasons). */
export const SHEET_CHIP_SELECTED =
	"cursor-pointer rounded-full border border-[#0f5384] bg-[#0f5384] px-3 py-1.5 text-xs text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";
