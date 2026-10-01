"use client";

import { useEffect, useState } from "react";
import { getCachedData } from "@/lib/utils/client-cache";

/**
 * Read localStorage SWR fallback only after mount.
 *
 * Why: the server has no browser cache, so reading cache during the first
 * client render makes HTML differ from SSR and triggers a hydration mismatch
 * (server shows empty/loading; client instantly shows cached stats).
 */
export function useClientCachedFallback<T>(key: string | null): T | undefined {
	const [fallback, setFallback] = useState<T | undefined>(undefined);

	useEffect(() => {
		if (!key) {
			setFallback(undefined);
			return;
		}
		setFallback(getCachedData<T>(key) ?? undefined);
	}, [key]);

	return fallback;
}
