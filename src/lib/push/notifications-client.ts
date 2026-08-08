/**
 * CAALM desktop (Web Push) client helpers.
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY (same value as VAPID_PUBLIC_KEY).
 */

export type EnableDesktopAlertsResult = {
	ok: boolean;
	reason?: "unsupported" | "denied" | "error" | "missing_vapid";
	message?: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

function isPushSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	);
}

export async function enableDesktopAlerts(): Promise<EnableDesktopAlertsResult> {
	if (!isPushSupported()) {
		return {
			ok: false,
			reason: "unsupported",
			message:
				"Desktop alerts are not supported in this browser. Try Chrome, Edge, or Firefox on desktop.",
		};
	}

	const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
	if (!vapidPublicKey) {
		return {
			ok: false,
			reason: "missing_vapid",
			message: "Desktop alerts are not configured (missing VAPID public key).",
		};
	}

	try {
		const permission = await Notification.requestPermission();
		if (permission !== "granted") {
			return {
				ok: false,
				reason: "denied",
				message:
					"Browser notification permission was denied. Enable notifications for this site in your browser settings, then try again.",
			};
		}

		const registration = await navigator.serviceWorker.register("/sw.js", {
			scope: "/",
		});
		await navigator.serviceWorker.ready;

		const existing = await registration.pushManager.getSubscription();
		const subscription =
			existing ||
			(await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(
					vapidPublicKey,
				) as BufferSource,
			}));

		const res = await fetch("/api/notifications/subscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ subscription: subscription.toJSON() }),
		});

		if (!res.ok) {
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			return {
				ok: false,
				reason: "error",
				message: data.error || "Failed to save desktop alert subscription.",
			};
		}

		return { ok: true };
	} catch (error) {
		console.error("[desktop-push] enable failed:", error);
		return {
			ok: false,
			reason: "error",
			message:
				error instanceof Error
					? error.message
					: "Failed to enable desktop alerts.",
		};
	}
}

export async function disableDesktopAlerts(): Promise<void> {
	if (!isPushSupported()) {
		await fetch("/api/notifications/unsubscribe", { method: "POST" }).catch(
			() => undefined,
		);
		return;
	}

	try {
		const registration = await navigator.serviceWorker.getRegistration("/");
		const subscription = await registration?.pushManager.getSubscription();
		if (subscription) {
			await subscription.unsubscribe();
		}
	} catch (error) {
		console.warn("[desktop-push] local unsubscribe failed:", error);
	}

	await fetch("/api/notifications/unsubscribe", { method: "POST" }).catch(
		() => undefined,
	);
}
