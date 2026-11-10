/** Grow a chat composer textarea with the text; scroll only after max height. */
export function growComposerTextarea(
	el: HTMLTextAreaElement | null,
	options: { minPx: number; maxPx: number },
): void {
	if (!el) return;
	const { minPx, maxPx } = options;
	// Use `auto` (not `0`): height 0 can shrink width mid-measure and fake multi-line scrollHeight.
	el.style.maxHeight = `${maxPx}px`;
	el.style.height = "auto";
	el.style.overflowY = "hidden";
	const contentPx = el.scrollHeight;
	const nextPx = Math.max(minPx, Math.min(contentPx, maxPx));
	el.style.height = `${nextPx}px`;
	el.style.overflowY = contentPx > maxPx ? "auto" : "hidden";
}
