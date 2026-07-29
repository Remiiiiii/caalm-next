"use server";

import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { hasPermission } from "@/lib/rbac/permissions";
import { daysUntilExpiry } from "@/lib/renewals/autoRenew";
import {
	buildExpirySmsMessage,
	parseAlertChannels,
	parseAlertRecipientIds,
	type AlertChannel,
} from "@/lib/renewals/expiryAlertChannels";
import {
	buildExpiryNoticeMetadata,
	matchesExpiryNoticeMetadata,
	shouldSendExpiryNotice,
	type ExpiryNoticeMetadata,
} from "@/lib/renewals/expiryNotice";
import {
	type ContractDepartment,
	formatDepartmentName,
} from "../../../constants";

const handleError = (error: unknown, message: string) => {
	console.log(error, message);
	throw error;
};

interface CreateNotificationProps {
	userId: string;
	title: string;
	message: string;
	type: string;
	read?: boolean;
	metadata?: string;
	triggerType?: "manual" | "automatic" | "scheduled";
	actionUrl?: string;
	actionText?: string;
	priority?: "low" | "medium" | "high" | "urgent";
}

export const createNotification = async ({
	userId,
	title,
	message,
	type,
	read = false,
	metadata,
	triggerType = "manual",
	actionUrl,
	actionText,
	priority,
}: CreateNotificationProps) => {
	const { tablesDB } = await createAdminClient();
	try {
		const { getUserDefaultOrganization } = await import(
			"@/lib/rbac/permissions"
		);
		const defaultOrg = await getUserDefaultOrganization(userId);
		if (!defaultOrg?.orgId) {
			throw new Error(
				`User ${userId} has no default organization - cannot create notification`,
			);
		}

		const data: Record<string, unknown> = {
			userId,
			title,
			message,
			type,
			read,
			orgId: defaultOrg.orgId,
			triggerType,
		};
		if (metadata) data.metadata = metadata;
		if (actionUrl) data.actionUrl = actionUrl;
		if (actionText) data.actionText = actionText;
		if (priority) data.priority = priority;

		const notification = await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.notificationsCollectionId || "notifications",
			rowId: ID.unique(),
			data,
		});

		try {
			const CacheManager = (await import("@/lib/services/cache-manager"))
				.default;
			await CacheManager.invalidateNotifications(userId);
		} catch (cacheError) {
			console.warn(
				"[createNotification] Could not invalidate notification cache:",
				cacheError,
			);
		}

		return notification;
	} catch (error) {
		handleError(error, "Failed to create notification");
	}
};

export const getNotifications = async (userId: string) => {
	const { tablesDB } = await createAdminClient();
	try {
		const notifications = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.notificationsCollectionId || "notifications",
			queries: [Query.equal("userId", userId), Query.orderDesc("$createdAt")],
		});
		return notifications;
	} catch (error) {
		handleError(error, "Failed to get notifications");
	}
};

export const markNotificationAsRead = async (notificationId: string) => {
	const { tablesDB } = await createAdminClient();
	try {
		const notification = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.notificationsCollectionId || "notifications",
			rowId: notificationId,
			data: { read: true },
		});
		return notification;
	} catch (error) {
		handleError(error, "Failed to mark notification as read");
	}
};

async function expiryNoticeAlreadySent(
	type: string,
	meta: ExpiryNoticeMetadata,
): Promise<boolean> {
	const { tablesDB } = await createAdminClient();
	const tableId =
		appwriteConfig.notificationsCollectionId || "notifications";

	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries: [
			Query.equal("type", type),
			Query.orderDesc("$createdAt"),
			Query.limit(100),
		],
	});

	return existing.rows.some((row) =>
		matchesExpiryNoticeMetadata(row.metadata as string | undefined, meta),
	);
}

type UserRow = {
	$id: string;
	accountId?: string;
	email?: string;
	fullName?: string;
	department?: string;
	phone?: string;
};

async function getContractEnterpriseAlertSettings(contractId: string): Promise<{
	channels: Set<AlertChannel>;
	recipientIds: string[];
}> {
	const tableId =
		appwriteConfig.contractsEnterpriseMetadataCollectionId ||
		appwriteConfig.contractExtensionsCollectionId;

	if (!appwriteConfig.databaseId || !tableId) {
		return {
			channels: parseAlertChannels(null),
			recipientIds: [],
		};
	}

	try {
		const { tablesDB } = await createAdminClient();
		const docs = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId,
			queries: [Query.equal("contractId", contractId), Query.limit(1)],
		});
		const row = docs.rows[0] as
			| {
					alertChannels?: unknown;
					alertRecipientIds?: unknown;
			  }
			| undefined;

		return {
			channels: parseAlertChannels(row?.alertChannels ?? null),
			recipientIds: parseAlertRecipientIds(row?.alertRecipientIds ?? null),
		};
	} catch (error) {
		console.warn(
			`Failed to load enterprise alert settings for contract ${contractId}:`,
			error,
		);
		return {
			channels: parseAlertChannels(null),
			recipientIds: [],
		};
	}
}

async function resolveAuthPhone(
	accountId: string,
): Promise<string | undefined> {
	try {
		const { Client, Users } = await import("node-appwrite");
		const client = new Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
			.setKey(process.env.NEXT_APPWRITE_API_KEY!);
		const authUsers = new Users(client);
		const authUser = await authUsers.get(accountId);
		return authUser.phone || undefined;
	} catch (error) {
		console.warn(`Could not fetch Auth phone for ${accountId}:`, error);
		return undefined;
	}
}

async function dispatchChannelAlerts(params: {
	user: UserRow;
	channels: Set<AlertChannel>;
	title: string;
	message: string;
	smsMessage: string;
}): Promise<void> {
	const { user, channels, title, message, smsMessage } = params;
	if (!user.accountId) return;

	if (channels.has("email") && user.email) {
		try {
			const { isDemoMode } = await import("@/lib/config/demo-mode");
			if (isDemoMode()) {
				console.log("[demo] Expiry email no-op:", {
					to: user.email,
					title,
				});
			} else {
				const { mailgunService } = await import("@/lib/services/mailgun");
				await mailgunService.sendEmail({
					to: user.email,
					subject: title,
					text: message,
					html: `<p>${message}</p>`,
				});
			}
		} catch (error) {
			console.warn(`Expiry email failed for user ${user.$id}:`, error);
		}
	}

	if (channels.has("sms")) {
		try {
			const { isDemoMode } = await import("@/lib/config/demo-mode");
			if (isDemoMode()) {
				console.log("[demo] Expiry SMS no-op:", {
					userId: user.$id,
					smsMessage,
				});
				return;
			}

			const { twilioService } = await import("@/lib/services/twilioService");
			if (!twilioService.isConfigured()) {
				console.warn("Twilio not configured; skipping expiry SMS");
				return;
			}

			const phone = user.phone || (await resolveAuthPhone(user.accountId));
			if (!phone) {
				console.warn(`No phone for user ${user.$id}; skipping expiry SMS`);
				return;
			}

			await twilioService.sendSMS({
				to: twilioService.formatPhoneNumber(phone),
				message: smsMessage,
				priority: "high",
			});
		} catch (error) {
			console.warn(`Expiry SMS failed for user ${user.$id}:`, error);
		}
	}
}

async function notifyEligibleUsers(params: {
	title: string;
	message: string;
	smsMessage: string;
	type: string;
	metadata: string;
	viewPermission: string;
	department?: string | null;
	matchDepartmentOnly?: boolean;
	channels?: Set<AlertChannel>;
	recipientIds?: string[];
}): Promise<number> {
	const { tablesDB } = await createAdminClient();
	if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
		return 0;
	}

	const channels = params.channels ?? parseAlertChannels(null);
	const recipientIds = params.recipientIds ?? [];
	const recipientIdSet = new Set(recipientIds);

	const users = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: appwriteConfig.usersCollectionId,
		queries: [Query.limit(100)],
	});

	let created = 0;

	for (const row of users.rows) {
		const user = row as UserRow;
		const hasSettingsView = await hasPermission(
			user.$id,
			PERMISSIONS.SETTINGS.VIEW,
		);
		const hasView = await hasPermission(user.$id, params.viewPermission);

		let shouldNotify = false;

		if (recipientIdSet.size > 0) {
			shouldNotify =
				recipientIdSet.has(user.$id) ||
				(!!user.accountId && recipientIdSet.has(user.accountId));
		} else if (hasSettingsView) {
			shouldNotify = true;
		} else if (
			params.matchDepartmentOnly &&
			hasView &&
			params.department &&
			user.department
		) {
			shouldNotify = user.department === params.department;
		} else if (!params.matchDepartmentOnly && hasView) {
			shouldNotify = true;
		}

		if (!shouldNotify || !user.accountId) continue;

		try {
			// Always write an in-app notification for dedupe + bell UI when any
			// channel is active (email/sms selections still create the record).
			const wantsInApp =
				channels.has("in_app") ||
				channels.has("email") ||
				channels.has("sms");

			if (wantsInApp) {
				const notification = await createNotification({
					userId: user.accountId,
					title: params.title,
					message: params.message,
					type: params.type,
					read: false,
					metadata: params.metadata,
					triggerType: "scheduled",
				});
				if (notification) created++;
			}

			await dispatchChannelAlerts({
				user,
				channels,
				title: params.title,
				message: params.message,
				smsMessage: params.smsMessage,
			});
		} catch (notifyError) {
			console.error(
				`Failed to create expiry notification for user ${user.$id}:`,
				notifyError,
			);
		}
	}

	return created;
}

/**
 * Notice-based expiry alerts for contracts and licenses.
 * Uses renewalNoticeDays (default 30) plus urgent cascade 15/10/5/1.
 * Contract SMS/email channels come from enterprise metadata alertChannels.
 */
export const checkDocumentExpirations = async () => {
	const { tablesDB } = await createAdminClient();
	try {
		if (!appwriteConfig.databaseId) {
			throw new Error("Database ID not configured");
		}

		let notificationsCreated = 0;

		// --- Contracts ---
		if (appwriteConfig.contractsCollectionId) {
			const contracts = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.contractsCollectionId,
				queries: [
					Query.isNotNull("contractExpiryDate"),
					Query.limit(1000),
				],
			});

			for (const contract of contracts.rows) {
				if (!contract.contractExpiryDate) continue;
				if (contract.status?.toLowerCase() === "expired") continue;
				if (contract.isExpired === true) continue;

				const daysUntil = daysUntilExpiry(contract.contractExpiryDate);
				if (
					!shouldSendExpiryNotice(daysUntil, contract.renewalNoticeDays)
				) {
					continue;
				}

				const meta: ExpiryNoticeMetadata = {
					entityType: "contract",
					entityId: contract.$id,
					daysUntil,
				};
				if (await expiryNoticeAlreadySent("contract-expiry", meta)) {
					continue;
				}

				const departmentLabel = contract.department
					? formatDepartmentName(contract.department)
					: "Unknown Department";
				const expirySlice = String(contract.contractExpiryDate).slice(0, 10);
				const autoRenew = contract.autoRenew === true;
				const actionPhrase = autoRenew
					? "is scheduled to auto-renew"
					: "is set to expire";
				const contractName =
					(contract.contractName as string) || "Untitled";
				const title = autoRenew
					? "Contract Renewal Notice"
					: "Contract Expiry Reminder";
				const message = `The contract "${contractName}" in ${departmentLabel} ${actionPhrase} in ${daysUntil} days (on ${expirySlice}).`;
				const smsMessage = buildExpirySmsMessage({
					entityLabel: "Contract",
					name: contractName,
					daysUntil,
					expirySlice,
					autoRenew,
				});

				const alertSettings = await getContractEnterpriseAlertSettings(
					contract.$id,
				);

				notificationsCreated += await notifyEligibleUsers({
					title,
					message,
					smsMessage,
					type: "contract-expiry",
					metadata: buildExpiryNoticeMetadata(meta),
					viewPermission: PERMISSIONS.CONTRACTS.VIEW,
					department: contract.department as string | undefined,
					matchDepartmentOnly: true,
					channels: alertSettings.channels,
					recipientIds: alertSettings.recipientIds,
				});
			}
		}

		// --- Licenses ---
		if (appwriteConfig.licensesCollectionId) {
			const licenses = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.licensesCollectionId,
				queries: [
					Query.isNotNull("licenseExpiryDate"),
					Query.limit(1000),
				],
			});

			for (const license of licenses.rows) {
				if (!license.licenseExpiryDate) continue;
				if (license.status?.toLowerCase() === "expired") continue;

				const daysUntil = daysUntilExpiry(license.licenseExpiryDate);
				if (
					!shouldSendExpiryNotice(daysUntil, license.renewalNoticeDays)
				) {
					continue;
				}

				const meta: ExpiryNoticeMetadata = {
					entityType: "license",
					entityId: license.$id,
					daysUntil,
				};
				if (await expiryNoticeAlreadySent("license-expiry", meta)) {
					continue;
				}

				const expirySlice = String(license.licenseExpiryDate).slice(0, 10);
				const autoRenew = license.autoRenew === true;
				const actionPhrase = autoRenew
					? "is scheduled to auto-renew"
					: "is set to expire";
				const licenseName =
					(license.licenseName as string) || "Untitled";
				const title = autoRenew
					? "License Renewal Notice"
					: "License Expiry Reminder";
				const message = `The license "${licenseName}" ${actionPhrase} in ${daysUntil} days (on ${expirySlice}).`;
				const smsMessage = buildExpirySmsMessage({
					entityLabel: "License",
					name: licenseName,
					daysUntil,
					expirySlice,
					autoRenew,
				});

				notificationsCreated += await notifyEligibleUsers({
					title,
					message,
					smsMessage,
					type: "license-expiry",
					metadata: buildExpiryNoticeMetadata(meta),
					viewPermission: PERMISSIONS.LICENSES.VIEW,
					matchDepartmentOnly: false,
					channels: parseAlertChannels(null),
				});
			}
		}

		return { notificationsCreated };
	} catch (error) {
		handleError(error, "Failed to check document expirations");
	}
};

/** @deprecated Prefer checkDocumentExpirations — kept for existing cron imports */
export const checkContractExpirations = checkDocumentExpirations;

export const assignContractToDepartment = async ({
	contractId,
	department,
}: {
	contractId: string;
	department: ContractDepartment;
}) => {
	const { tablesDB } = await createAdminClient();
	try {
		const updatedContract = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			rowId: contractId,
			data: { department },
		});

		if (updatedContract.fileId) {
			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.filesCollectionId,
				rowId: updatedContract.fileId,
				data: { department },
			});
		}

		await checkDocumentExpirations();
		return updatedContract;
	} catch (error) {
		handleError(error, "Failed to assign contract to department");
	}
};
