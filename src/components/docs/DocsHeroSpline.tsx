"use client";

import { useEffect, useState } from "react";
import SplineCanvas from "@/components/SplineCanvas";
import { DESKTOP_MIN_WIDTH } from "@/lib/ui/desktop-first";

/**
 * Docs hero robot — laptop/desktop only.
 * Avoids loading the Spline runtime on phone and tablet.
 */
export function DocsHeroSpline() {
	const [show, setShow] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
		const sync = () => setShow(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	if (!show) return null;

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute top-1/2 right-0 z-10 w-[min(42%,360px)] -translate-y-1/2"
		>
			<div className="relative aspect-square w-full overflow-hidden">
				<SplineCanvas
					scene="/scene.splinecode"
					className="pointer-events-none absolute inset-0 h-full w-full"
					delayMs={150}
					durationMs={400}
					zoom={1.5}
				/>
			</div>
		</div>
	);
}
