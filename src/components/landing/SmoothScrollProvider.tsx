"use client";

import "lenis/dist/lenis.css";
import { ReactLenis } from "lenis/react";
import { type ReactNode, useEffect, useState } from "react";

interface SmoothScrollProviderProps {
	children: ReactNode;
}

const SMOOTH_OPTIONS = {
	lerp: 0.1,
	duration: 1.2,
	smoothWheel: true,
} as const;

const REDUCED_OPTIONS = {
	lerp: 1,
	duration: 0,
	smoothWheel: false,
} as const;

export default function SmoothScrollProvider({
	children,
}: SmoothScrollProviderProps) {
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReducedMotion(mediaQuery.matches);
		update();
		mediaQuery.addEventListener("change", update);
		return () => mediaQuery.removeEventListener("change", update);
	}, []);

	// Always wrap with Lenis so children never remount (remounting left
	// whileInView sections stuck at opacity: 0 after refresh).
	return (
		<ReactLenis root options={reducedMotion ? REDUCED_OPTIONS : SMOOTH_OPTIONS}>
			{children}
		</ReactLenis>
	);
}
