"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const RB2B_SCRIPT_ID = "rb2b-script";

/**
 * RB2B (https://app.rb2b.com) visitor identification.
 * Next.js App Router keeps the document mounted across navigations, so we
 * re-inject the script whenever the pathname changes (official RB2B guidance).
 */
export function RB2BLoader() {
	const pathname = usePathname();
	const scriptId = process.env.NEXT_PUBLIC_RB2B_ID?.trim();

	useEffect(() => {
		if (!scriptId || typeof document === "undefined") return;

		const existing = document.getElementById(RB2B_SCRIPT_ID);
		if (existing) existing.remove();

		// Reset the snippet guard so a fresh load can run after SPA navigations.
		const reb2bWindow = window as Window & { reb2b?: { loaded?: boolean } };
		if (reb2bWindow.reb2b) {
			delete reb2bWindow.reb2b;
		}

		const script = document.createElement("script");
		script.id = RB2B_SCRIPT_ID;
		script.async = true;
		script.src = `https://ddwl4m2hdecbv.cloudfront.net/b/${scriptId}/${scriptId}.js.gz`;
		document.body.appendChild(script);

		return () => {
			const current = document.getElementById(RB2B_SCRIPT_ID);
			if (current) current.remove();
		};
	}, [pathname, scriptId]);

	return null;
}
