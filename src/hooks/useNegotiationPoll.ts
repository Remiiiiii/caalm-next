"use client";

import { useEffect, useRef } from "react";

interface NegotiationPollOptions {
	enabled?: boolean;
	paused?: boolean;
	intervalMs?: number;
}

/** Refresh negotiation data while the page is visible without overlapping requests. */
export function useNegotiationPoll(
	refresh: () => Promise<void>,
	{
		enabled = true,
		paused = false,
		intervalMs = 12_000,
	}: NegotiationPollOptions = {},
) {
	const refreshRef = useRef(refresh);
	const runningRef = useRef(false);

	useEffect(() => {
		refreshRef.current = refresh;
	}, [refresh]);

	useEffect(() => {
		if (!enabled || paused) return;

		const run = async () => {
			if (document.visibilityState !== "visible" || runningRef.current) return;
			runningRef.current = true;
			try {
				await refreshRef.current();
			} finally {
				runningRef.current = false;
			}
		};
		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") void run();
		};
		const interval = window.setInterval(() => void run(), intervalMs);
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [enabled, intervalMs, paused]);
}
