/**
 * CAALM Web Push server helpers (web-push + Appwrite persistence).
 *
 * One-time VAPID key generation (run once, store in env — never commit private key):
 *   pnpm exec web-push generate-vapid-keys
 *
 * Required env:
 *   VAPID_PUBLIC_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT (mailto:… or https://…)
 */

import { ID, Query } from "node-appwrite";
import webpush from "web-push";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { notificationService } from "@/lib/services/notificationService";

export type DesktopAlertSeverity = "info" | "warning" | "critical";

export type DesktopAlertPayload = {
	title: string;
	body: string;
	url: string;
	/** Sticky until dismissed — only for ≤2 days / expired */
	urgent?: boolean;
	/** Stable per-entity tag so updates replace instead of stacking */
	tag?: string;
	severity?: DesktopAlertSeverity;
};

export type PushSubscriptionJSON = {
	endpoint: string;
	expirationTime?: number | null;
	keys: {
		p256dh: string;
		auth: string;
	};
};

let vapidConfigured = false;
let vapidMissingLogged = false;

function ensureVapidConfigured(): boolean {
	const publicKey =
		process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	const subject =
		process.env.VAPID_SUBJECT ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"mailto:support@caalm.app";

	if (!publicKey || !privateKey) {
		if (!vapidMissingLogged) {
			console.warn(
				"[desktop-push] VAPID keys missing; desktop alerts are disabled. Generate with: pnpm exec web-push generate-vapid-keys",
			);
			vapidMissingLogged = true;
		}
		return false;
	}

	if (!vapidConfigured) {
		webpush.setVapidDetails(subject, publicKey, privateKey);
		vapidConfigured = true;
	}
	return true;
}

function pushSubscriptionsTableId(): string {
	return (
		appwriteConfig.pushSubscriptionsCollectionId || "69b8a208008a1f5d9b08"
	);
}

/** Truncate entity names for toast body (~one line on Windows). */
export function truncateForToast(name: string, max = 42): string {
	const trimmed = name.trim() || "Untitled";
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Sticky + red icon only when ≤2 days (or already due/expired).
 * Amber icon for 3–7 days. Neutral otherwise.
 */
export function desktopSeverityForDays(
	daysUntil: number,
): DesktopAlertSeverity {
	if (!Number.isFinite(daysUntil) || daysUntil <= 2) return "critical";
	if (daysUntil <= 7) return "warning";
	return "info";
}

export function isStickyDesktopUrgent(daysUntil: number): boolean {
	return Number.isFinite(daysUntil) && daysUntil <= 2;
}

export function buildDesktopExpiryAlert(params: {
	kind: "contract" | "license" | "audit";
	name: string;
	daysUntil: number;
	expirySlice: string;
	autoRenew?: boolean;
	entityId: string;
	url: string;
}): DesktopAlertPayload {
	const shortName = truncateForToast(params.name);
	const days = params.daysUntil;
	const severity = desktopSeverityForDays(days);
	const urgent = isStickyDesktopUrgent(days);

	if (params.kind === "contract") {
		const verb = params.autoRenew ? "renews" : "expires";
		const url = `/dashboard?expiryEntity=contract&expiryId=${encodeURIComponent(params.entityId)}`;
		return {
			title:
				days <= 0
					? params.autoRenew
						? "Contract renewing today"
						: "Contract expired"
					: `Contract ${verb === "renews" ? "renews" : "expiring"} in ${days} day${days === 1 ? "" : "s"}`,
			body: `${shortName} ${verb} ${params.expirySlice}`,
			url,
			urgent,
			severity,
			tag: `contract-expiry:${params.entityId}`,
		};
	}

	if (params.kind === "license") {
		const url = `/dashboard?expiryEntity=license&expiryId=${encodeURIComponent(params.entityId)}`;
		return {
			title:
				days <= 0
					? "License expired"
					: `License expiring in ${days} day${days === 1 ? "" : "s"}`,
			body: `${shortName} expires ${params.expirySlice}`,
			url,
			urgent,
			severity,
			tag: `license-expiry:${params.entityId}`,
		};
	}

	const url = `/dashboard?expiryEntity=audit&expiryId=${encodeURIComponent(params.entityId)}`;
	return {
		title:
			days <= 0
				? "Audit due today"
				: `Audit due in ${days} day${days === 1 ? "" : "s"}`,
		body: `${shortName} due ${params.expirySlice}`,
		url,
		urgent,
		severity,
		tag: `audit-upcoming:${params.entityId}`,
	};
}

export async function savePushSubscription(
	userId: string,
	subscription: PushSubscriptionJSON,
): Promise<void> {
	if (!userId || !subscription?.endpoint || !subscription?.keys) {
		throw new Error("Invalid push subscription");
	}

	const { tablesDB } = await createAdminClient();
	const tableId = pushSubscriptionsTableId();
	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries: [Query.equal("user_id", userId), Query.limit(1)],
	});

	const data = {
		user_id: userId,
		endpoint: subscription.endpoint.slice(0, 512),
		subscription_json: JSON.stringify(subscription).slice(0, 4096),
	};

	if (existing.rows[0]) {
		await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId,
			rowId: existing.rows[0].$id,
			data,
		});
		return;
	}

	await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId,
		tableId,
		rowId: ID.unique(),
		data,
	});
}

export async function removePushSubscription(userId: string): Promise<void> {
	if (!userId) return;

	const { tablesDB } = await createAdminClient();
	const tableId = pushSubscriptionsTableId();
	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries: [Query.equal("user_id", userId), Query.limit(10)],
	});

	await Promise.all(
		existing.rows.map((row) =>
			tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId,
				tableId,
				rowId: row.$id,
			}),
		),
	);
}

async function getStoredSubscription(
	userId: string,
): Promise<{ $id: string; subscription: PushSubscriptionJSON } | null> {
	const { tablesDB } = await createAdminClient();
	const tableId = pushSubscriptionsTableId();
	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries: [Query.equal("user_id", userId), Query.limit(1)],
	});

	const row = existing.rows[0] as
		| { $id: string; subscription_json?: string }
		| undefined;
	if (!row?.subscription_json) return null;

	try {
		const subscription = JSON.parse(
			row.subscription_json,
		) as PushSubscriptionJSON;
		if (!subscription.endpoint || !subscription.keys) return null;
		return { $id: row.$id, subscription };
	} catch {
		return null;
	}
}

/**
 * Send a native desktop push to a user's subscribed browser.
 * Deletes the stored subscription on HTTP 410 Gone.
 */
export async function sendDesktopAlert(
	userId: string,
	payload: DesktopAlertPayload,
): Promise<boolean> {
	if (!userId || !payload?.title || !payload?.body) return false;
	if (!ensureVapidConfigured()) return false;

	try {
		const settings = await notificationService.getNotificationSettings(userId);
		if (!settings?.desktop_alerts_enabled) {
			return false;
		}
	} catch (error) {
		console.warn(
			`[desktop-push] Could not load settings for ${userId}:`,
			error,
		);
		return false;
	}

	const stored = await getStoredSubscription(userId);
	if (!stored) return false;

	const body = JSON.stringify({
		title: payload.title,
		body: payload.body,
		url: payload.url || "/",
		urgent: Boolean(payload.urgent),
		tag: payload.tag,
		severity: payload.severity || "info",
	});

	try {
		await webpush.sendNotification(stored.subscription, body);
		return true;
	} catch (error: unknown) {
		const statusCode =
			typeof error === "object" &&
			error !== null &&
			"statusCode" in error &&
			typeof (error as { statusCode: unknown }).statusCode === "number"
				? (error as { statusCode: number }).statusCode
				: undefined;

		if (statusCode === 410 || statusCode === 404) {
			try {
				const { tablesDB } = await createAdminClient();
				await tablesDB.deleteRow({
					databaseId: appwriteConfig.databaseId,
					tableId: pushSubscriptionsTableId(),
					rowId: stored.$id,
				});
			} catch (deleteError) {
				console.warn(
					`[desktop-push] Failed to delete stale subscription for ${userId}:`,
					deleteError,
				);
			}
			return false;
		}

		console.warn(`[desktop-push] send failed for ${userId}:`, error);
		return false;
	}
}
