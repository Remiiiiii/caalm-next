import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { notificationService } from "@/lib/services/notificationService";
import { STEWARDSHIP_DIGEST_NOTIFICATION_TYPE } from "./constants";
import { listStewardshipQueue } from "./stewardship-queue";

function settingsTableId(): string {
	return (
		appwriteConfig.notificationSettingsCollectionId ||
		"notification-settings"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

export function userHasStewardshipDigestEnabled(
	notificationTypes: string[] | undefined,
): boolean {
	return (
		Array.isArray(notificationTypes) &&
		notificationTypes.includes(STEWARDSHIP_DIGEST_NOTIFICATION_TYPE)
	);
}

export async function sendStewardshipDigestsForFrequency(
	frequency: "daily" | "weekly",
): Promise<{ usersNotified: number; skipped: number }> {
	const { tablesDB } = await createAdminClient();
	const settings = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: settingsTableId(),
		queries: [Query.equal("frequency", frequency), Query.limit(200)],
	});

	let usersNotified = 0;
	let skipped = 0;

	for (const row of settings.rows as unknown as Record<string, unknown>[]) {
		const types = row.notification_types as string[] | undefined;
		if (!userHasStewardshipDigestEnabled(types)) {
			skipped += 1;
			continue;
		}
		if (!row.email_enabled) {
			skipped += 1;
			continue;
		}

		const userId = String(row.user_id || "");
		if (!userId) continue;

		const org = await getUserDefaultOrganization(userId);
		if (!org?.orgId) {
			skipped += 1;
			continue;
		}

		const queue = await listStewardshipQueue(org.orgId);
		const lines =
			queue.length === 0
				? ["No at-risk constituents in your queue right now."]
				: queue.slice(0, 10).map(
						(item, index) =>
							`${index + 1}. ${item.displayName} — ${item.segment}, lapse ${item.lapseRiskScore}/100`,
					);

		await notificationService.createNotification({
			type: STEWARDSHIP_DIGEST_NOTIFICATION_TYPE,
			title: "Stewardship queue digest",
			message: lines.join("\n"),
			userId,
			priority: "medium",
			actionUrl: "/constituents/stewardship",
			actionText: "Open queue",
		});
		usersNotified += 1;
	}

	return { usersNotified, skipped };
}
