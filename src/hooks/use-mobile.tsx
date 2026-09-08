import * as React from "react";
import { DESKTOP_MIN_WIDTH } from "@/lib/ui/desktop-first";

/** `true` / `false` after measure; `undefined` until the first layout read. */
export function useIsMobileState(): boolean | undefined {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
		undefined,
	);

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${DESKTOP_MIN_WIDTH - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < DESKTOP_MIN_WIDTH);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < DESKTOP_MIN_WIDTH);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return isMobile;
}

/** Matches Tailwind `lg` — sidebar visible at lg+; drawer below. */
export function useIsMobile() {
	return !!useIsMobileState();
}
