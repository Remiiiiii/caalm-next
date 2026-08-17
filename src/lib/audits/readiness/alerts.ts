import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { createNotification } from "@/lib/actions/notification.actions";
import { hasPermission } from "@/lib/rbac/permissions";
import type { ComplianceRagStatus } from "@/lib/audits/types";

export async function notifyAuditViewUsers(options: {
	orgId: string;
	title: string;
	message: string;
	score: number | null;
	ragStatus: ComplianceRagStatus | null;
	critical: number;
}): Promise<number> {
	const { tablesDB } = await createAdminClient();
	if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
		return 0;
	}

	const users = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: appwriteConfig.usersCollectionId,
		queries: [Query.equal("orgId", options.orgId), Query.limit(200)],
	});

	let created = 0;
	for (const row of users.rows) {
		const userId = String(row.$id);
		const accountId = row.accountId ? String(row.accountId) : null;
		const canView = await hasPermission(userId, PERMISSIONS.AUDIT.VIEW);
		if (!canView || !accountId) continue;

		try {
			await createNotification({
				userId: accountId,
				title: options.title,
				message: options.message,
				type: "contract-expiry",
				read: false,
				metadata: JSON.stringify({
					kind: "audit_readiness",
					orgId: options.orgId,
					score: options.score,
					ragStatus: options.ragStatus,
					critical: options.critical,
				}),
				triggerType: "scheduled",
				actionUrl: "/audits/readiness",
				actionText: "View readiness",
			});
			created += 1;
		} catch (error) {
			console.warn(
				"[SERVER] notifyAuditViewUsers failed for",
				userId,
				error instanceof Error ? error.message : error,
			);
		}
	}
	return created;
}
