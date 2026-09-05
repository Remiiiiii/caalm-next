/**
 * In-app notifications when a contract or license is deleted.
 *
 * Recipients (same org):
 * - Super Admins
 * - Organization Admins
 * - Department Managers for the document's department
 */

import {
	NotificationService,
	notificationService,
} from "@/lib/services/notificationService";
import {
	getAllAdmins,
	getAllExecutives,
	getUsersByRoleNames,
} from "@/lib/utils/get-users-by-role";

type DeleteKind = "contract" | "license";

type DeleteNotifyInput = {
	kind: DeleteKind;
	documentId: string;
	documentName: string;
	orgId?: string | null;
	department?: string | null;
	/** Actor users-table $id and/or Auth accountId — skipped as recipient */
	deletedByUserId?: string | null;
	deletedByAccountId?: string | null;
	deletedByName?: string | null;
};

type Recipient = {
	userId: string;
	accountId?: string;
};

const DELETE_NOTIFICATION_TYPES = [
	{
		type_key: "contract-deleted",
		label: "Contract Deleted",
		icon: "trash",
		color_classes: "text-red-600",
		bg_color_classes: "bg-red-50",
		priority: "high" as const,
		enabled: true,
		description: "Alert when a contract is deleted",
	},
	{
		type_key: "license-deleted",
		label: "License Deleted",
		icon: "trash",
		color_classes: "text-red-600",
		bg_color_classes: "bg-red-50",
		priority: "high" as const,
		enabled: true,
		description: "Alert when a license is deleted",
	},
] as const;

let deleteTypesEnsured: Promise<void> | null = null;

async function ensureDeleteNotificationTypes(): Promise<void> {
	if (!deleteTypesEnsured) {
		deleteTypesEnsured = (async () => {
			const service = new NotificationService();
			for (const type of DELETE_NOTIFICATION_TYPES) {
				try {
					const existing = await service.getNotificationType(type.type_key);
					if (!existing) {
						await service.createNotificationType({ ...type });
					}
				} catch (error) {
					console.warn(
						`[delete-notify] failed to ensure type ${type.type_key}`,
						error,
					);
				}
			}
		})();
	}
	await deleteTypesEnsured;
}

function normalizeDept(value: string | null | undefined): string {
	// "Child Welfare", "child-welfare", and "childwelfare" all compare equal.
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[-_\s]+/g, "");
}

function toRecipient(user: {
	$id?: string;
	accountId?: string;
}): Recipient | null {
	const userId = String(user.$id || "").trim();
	if (!userId) return null;
	const accountId = String(user.accountId || "").trim() || undefined;
	return { userId, accountId };
}

function isExcluded(
	recipient: Recipient,
	excludeIds: Set<string>,
): boolean {
	if (excludeIds.has(recipient.userId)) return true;
	if (recipient.accountId && excludeIds.has(recipient.accountId)) return true;
	return false;
}

/**
 * Collect Super Admins, Org Admins, and managers for the document department.
 */
async function collectDeleteRecipients(params: {
	orgId?: string | null;
	department?: string | null;
	excludeUserIds?: Array<string | null | undefined>;
}): Promise<Recipient[]> {
	const orgId = params.orgId || undefined;
	const targetDept = normalizeDept(params.department);
	const excludeIds = new Set(
		(params.excludeUserIds || [])
			.map((id) => String(id || "").trim())
			.filter(Boolean),
	);

	const byUserId = new Map<string, Recipient>();

	const addUsers = (users: Array<{ $id?: string; accountId?: string }>) => {
		for (const user of users) {
			const recipient = toRecipient(user);
			if (!recipient || isExcluded(recipient, excludeIds)) continue;
			if (!byUserId.has(recipient.userId)) {
				byUserId.set(recipient.userId, recipient);
			}
		}
	};

	const [executives, admins, managers] = await Promise.all([
		getAllExecutives(orgId).catch(() => []),
		getAllAdmins(orgId).catch(() => []),
		// No status=active filter — many manager profiles have null status.
		getUsersByRoleNames(["Department Manager", "manager"], orgId).catch(
			() => [],
		),
	]);

	addUsers(executives);
	addUsers(admins);

	if (targetDept) {
		const matchingManagers = managers.filter((user) => {
			const dept = normalizeDept(
				(user as { department?: string; departmentLabel?: string })
					.department ||
					(user as { departmentLabel?: string }).departmentLabel,
			);
			return dept.length > 0 && dept === targetDept;
		});
		addUsers(matchingManagers);
	}

	return [...byUserId.values()];
}

async function notifyDocumentDeleted(
	input: DeleteNotifyInput,
): Promise<number> {
	try {
		await ensureDeleteNotificationTypes();

		const recipients = await collectDeleteRecipients({
			orgId: input.orgId,
			department: input.department,
			excludeUserIds: [input.deletedByUserId, input.deletedByAccountId],
		});

		if (recipients.length === 0) {
			console.warn(
				`[delete-notify] no recipients for ${input.kind} ${input.documentId}`,
			);
			return 0;
		}

		const type =
			input.kind === "contract" ? "contract-deleted" : "license-deleted";
		const kindLabel = input.kind === "contract" ? "Contract" : "License";
		const actor =
			input.deletedByName?.trim() || "A user";
		const title = `${kindLabel} deleted: ${input.documentName}`;
		const message = `${actor} deleted ${input.kind} "${input.documentName}".`;
		const actionUrl =
			input.kind === "contract" ? "/contracts" : "/licenses";

		let created = 0;
		for (const recipient of recipients) {
			try {
				await notificationService.createNotification({
					type,
					title,
					message,
					userId: recipient.userId,
					priority: "high",
					actionUrl,
					actionText:
						input.kind === "contract" ? "View contracts" : "View licenses",
					triggerType: "automatic",
					triggeredBy: input.deletedByUserId || "system",
					metadata: {
						kind: `${input.kind}_deleted`,
						documentId: input.documentId,
						documentName: input.documentName,
						department: input.department || null,
						orgId: input.orgId || null,
						deletedByUserId: input.deletedByUserId || null,
					},
				});
				created += 1;
			} catch (error) {
				console.warn(
					`[delete-notify] failed for user ${recipient.userId}`,
					error instanceof Error ? error.message : error,
				);
			}
		}

		return created;
	} catch (error) {
		console.error(
			`[delete-notify] ${input.kind} notify failed`,
			error instanceof Error ? error.message : error,
		);
		return 0;
	}
}

export async function notifyContractDeleted(params: {
	contractId: string;
	contractName: string;
	orgId?: string | null;
	department?: string | null;
	deletedByUserId?: string | null;
	deletedByAccountId?: string | null;
	deletedByName?: string | null;
}): Promise<number> {
	return notifyDocumentDeleted({
		kind: "contract",
		documentId: params.contractId,
		documentName: params.contractName,
		orgId: params.orgId,
		department: params.department,
		deletedByUserId: params.deletedByUserId,
		deletedByAccountId: params.deletedByAccountId,
		deletedByName: params.deletedByName,
	});
}

export async function notifyLicenseDeleted(params: {
	licenseId: string;
	licenseName: string;
	orgId?: string | null;
	department?: string | null;
	deletedByUserId?: string | null;
	deletedByAccountId?: string | null;
	deletedByName?: string | null;
}): Promise<number> {
	return notifyDocumentDeleted({
		kind: "license",
		documentId: params.licenseId,
		documentName: params.licenseName,
		orgId: params.orgId,
		department: params.department,
		deletedByUserId: params.deletedByUserId,
		deletedByAccountId: params.deletedByAccountId,
		deletedByName: params.deletedByName,
	});
}
