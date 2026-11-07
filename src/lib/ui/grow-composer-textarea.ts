/** Grow a chat composer textarea with the text; scroll only after max height. */
export function growComposerTextarea(
	el: HTMLTextAreaElement | null,
	options: { minPx: number; maxPx: number },
): void {
	if (!el) return;
	const { minPx, maxPx } = options;
	el.style.height = "auto";
	el.style.overflowY = "hidden";
	const contentPx = el.scrollHeight;
	el.style.height = `${Math.max(minPx, Math.min(contentPx, maxPx))}px`;
	el.style.overflowY = contentPx > maxPx ? "auto" : "hidden";
}
