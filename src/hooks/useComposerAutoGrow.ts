"use client";

import { useLayoutEffect, useRef } from "react";
import { growComposerTextarea } from "@/lib/ui/grow-composer-textarea";

/** Ref + auto height for chat composers (Ask CAALM, Focus, etc.). */
export function useComposerAutoGrow(
	value: string,
	minPx: number,
	maxPx: number,
) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useLayoutEffect(() => {
		growComposerTextarea(ref.current, { minPx, maxPx });
	}, [value, minPx, maxPx]);
	return ref;
}
