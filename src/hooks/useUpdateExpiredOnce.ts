"use client";

import { useEffect } from "react";

/**
 * One shared POST so expiry widgets do not each sync on the same page.
 */
export function useUpdateExpiredOnce(enabled = true) {
	useEffect(() => {
		if (!enabled) return;
		void fetch("/api/contracts/update-expired", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		}).catch(() => {
			// Background sync — date-based filters still work without it.
		});
	}, [enabled]);
}
