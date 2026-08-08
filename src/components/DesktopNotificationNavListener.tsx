"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * When a desktop notification is clicked and WindowClient.navigate is unavailable,
 * the service worker posts CAALM_DESKTOP_NOTIFICATION_NAV so we can router.push.
 */
export function DesktopNotificationNavListener() {
	const router = useRouter();

	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;

		const onMessage = (event: MessageEvent) => {
			const data = event.data as { type?: string; url?: string } | undefined;
			if (data?.type !== "CAALM_DESKTOP_NOTIFICATION_NAV" || !data.url) return;

			try {
				const parsed = new URL(data.url, window.location.origin);
				if (parsed.origin !== window.location.origin) return;
				router.push(`${parsed.pathname}${parsed.search}${parsed.hash}`);
			} catch {
				// ignore malformed URLs
			}
		};

		navigator.serviceWorker.addEventListener("message", onMessage);
		return () => {
			navigator.serviceWorker.removeEventListener("message", onMessage);
		};
	}, [router]);

	return null;
}
