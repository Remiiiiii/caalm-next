/**
 * One look for every modal, taken from the Select Contract Type dialog:
 * a lightly frosted backdrop and a frosted glass panel with a large radius.
 * `DialogContent` and `AlertDialogContent` already apply both; use these for
 * hand-built modals (portals, `fixed inset-0` layers) so they match.
 */

/** Backdrop behind a modal. */
export const MODAL_OVERLAY = "bg-white/10 backdrop-blur-xs";

/** Panel shell of a modal (frosted glass, border and shadow from `.glass-dialog-panel`). */
export const MODAL_PANEL = "glass-dialog-panel rounded-[26px]";
