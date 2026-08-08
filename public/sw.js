/* global self, clients */
/**
 * CAALM Web Push service worker.
 * Native OS notifications only — no custom toast chrome (browser/OS controlled).
 */

function severityIcon(severity) {
	if (severity === "critical") return "/assets/icons/notify-critical.png";
	if (severity === "warning") return "/assets/icons/notify-warning.png";
	return "/assets/icons/notify-default.png";
}

self.addEventListener("push", (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = {
			title: "New alert",
			body: event.data?.text?.() || "You have a new alert.",
		};
	}

	const title = String(payload.title || "New alert");
	const body = String(payload.body || "");
	const url = String(payload.url || "/");
	const tag = payload.tag ? String(payload.tag) : undefined;
	const urgent = Boolean(payload.urgent);
	const severity = String(payload.severity || "info");

	const options = {
		body,
		icon: severityIcon(severity),
		badge: "/assets/icons/notify-badge.png",
		tag,
		renotify: Boolean(tag),
		requireInteraction: urgent,
		data: { url, severity },
		actions: [
			{ action: "view", title: "View" },
			{ action: "dismiss", title: "Dismiss" },
		],
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	const action = event.action;
	event.notification.close();

	if (action === "dismiss") {
		return;
	}

	const rawUrl = event.notification?.data?.url || "/";
	const targetUrl = (() => {
		try {
			return new URL(rawUrl, self.location.origin).href;
		} catch {
			return `${self.location.origin}/`;
		}
	})();

	event.waitUntil(
		(async () => {
			const windowClients = await clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			const origin = self.location.origin;

			for (const client of windowClients) {
				try {
					if (new URL(client.url).origin !== origin) continue;

					if ("focus" in client) {
						await client.focus();
					}

					// Prefer in-place navigation so we don't open a duplicate tab
					if (typeof client.navigate === "function") {
						await client.navigate(targetUrl);
						return;
					}

					client.postMessage({
						type: "CAALM_DESKTOP_NOTIFICATION_NAV",
						url: targetUrl,
					});
					return;
				} catch {
					// try next client
				}
			}

			if (clients.openWindow) {
				await clients.openWindow(targetUrl);
			}
		})(),
	);
});
