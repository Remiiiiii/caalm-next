"use client";

import { useLayoutEffect, useRef } from "react";
import { growComposerTextarea } from "@/lib/ui/grow-composer-textarea";

/**
 * Ref + auto height for chat composers (Ask CAALM, Focus, etc.).
 * Pass layoutKey (e.g. message count) so height re-clamps when the thread reflows.
 */
export function useComposerAutoGrow(
	value: string,
	minPx: number,
	maxPx: number,
	layoutKey?: string | number,
) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useLayoutEffect(() => {
		growComposerTextarea(ref.current, { minPx, maxPx });
	}, [value, minPx, maxPx, layoutKey]);
	return ref;
}
