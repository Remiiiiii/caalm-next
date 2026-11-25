/**
 * One look for every modal, taken from the Select Contract Type dialog:
 * a lightly frosted backdrop and a frosted glass panel with a large radius.
 * `DialogContent` and `AlertDialogContent` already apply both; use these for
 * hand-built modals (portals, `fixed inset-0` layers) so they match.
 */

/** Backdrop behind a modal, for the normal case (light page behind it). */
export const MODAL_OVERLAY = "bg-white/10 backdrop-blur-xs";

/**
 * Backdrop behind a modal that opens over a dark section (e.g. a video
 * preview). The glass panel's own `backdrop-filter` samples whatever paints
 * behind it — the overlay — so at `MODAL_OVERLAY`'s 10% tint a dark section
 * bleeds through and the panel's white glass turns muddy, dropping its text
 * contrast. A stronger light scrim keeps the panel crisp regardless of what
 * is behind it. Picked dynamically by `useDarkSurfaceBehind` — never set
 * this as a page-level default; `globals.css`'s glass recipe is unchanged.
 */
export const MODAL_OVERLAY_OVER_DARK = "bg-white/70 backdrop-blur-xs";

/** Panel shell of a modal (frosted glass, border and shadow from `.glass-dialog-panel`). */
export const MODAL_PANEL = "glass-dialog-panel rounded-[26px]";

/** Back button that sits at the top of a dialog, on the same row as the close X. */
export const DIALOG_BACK_LINK_CLASS =
	"inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab] disabled:cursor-not-allowed disabled:opacity-50";

/** Upload wizard header chips: all share the Government Contract chip's height (23px). */
export const HEADER_BADGE_CLASS =
	"inline-flex h-[23px] shrink-0 items-center whitespace-nowrap rounded-full border px-[9px] text-[11.5px] font-semibold leading-normal";

/**
 * The single z-index every toast system (radix Toast, Sonner) renders at,
 * so a toast always sits above an open Dialog/AlertDialog (z-50) regardless
 * of which one fired it. Both toasters must also portal to document.body —
 * z-index alone doesn't help a toast trapped inside a `position: relative`
 * ancestor (see (root)/layout.tsx's `relative z-0` wrapper), since Dialog
 * content portals to body directly and wins the comparison at that
 * ancestor's z-0 regardless of the trapped toast's own z-index.
 */
export const TOAST_Z_INDEX = 10002;
