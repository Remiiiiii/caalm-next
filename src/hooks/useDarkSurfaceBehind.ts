"use client";

import { useEffect, useState } from "react";

/** Mark any element with a dark, dominant background (a video preview, a
 * recorder surface) so a modal opening on top of the page can tell its
 * overlay to use the over-dark glass recipe instead of the default one. */
export const DARK_SURFACE_SELECTOR = "[data-dark-surface]";

type Rect = { top: number; left: number; right: number; bottom: number };

/** Pure: does any rect actually intersect the viewport? Extracted for testing. */
export function hasVisibleDarkSurface(
	rects: Rect[],
	viewport: { width: number; height: number },
): boolean {
	return rects.some(
		(r) =>
			r.right > 0 &&
			r.bottom > 0 &&
			r.left < viewport.width &&
			r.top < viewport.height,
	);
}

/** True while a `[data-dark-surface]` element is visible in the viewport. Checked once at mount (modal open), which is when this is consumed. */
export function useDarkSurfaceBehind(): boolean {
	const [overDark, setOverDark] = useState(false);

	useEffect(() => {
		const elements = document.querySelectorAll(DARK_SURFACE_SELECTOR);
		const rects = Array.from(elements).map((el) => el.getBoundingClientRect());
		setOverDark(
			hasVisibleDarkSurface(rects, {
				width: window.innerWidth,
				height: window.innerHeight,
			}),
		);
	}, []);

	return overDark;
}
