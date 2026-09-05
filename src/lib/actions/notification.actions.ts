"use server";

import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { hasPermission } from "@/lib/rbac/permissions";
import { daysUntilExpiry } from "@/lib/renewals/autoRenew";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";
import { DEFAULT_ORG_TIMEZONE } from "@/lib/timezone";
import { getOrganizationTimezone } from "@/lib/timezone/org";
import {
	type AlertChannel,
	buildExpirySmsMessage,
	parseAlertChannels,
	parseAlertRecipientIds,
} from "@/lib/renewals/expiryAlertChannels";
import {
	buildExpiryNoticeMetadata,
	type ExpiryNoticeMetadata,
	parseExpiryNoticeMetadata,
	shouldSendExpiryNotice,
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


async function loadExpiryNoticeSentKeys(
	types: string[],
): Promise<Set<string>> {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.notificationsCollectionId || "notifications";
	const sent = new Set<string>();

	await Promise.all(
		types.map(async (type) => {
			const existing = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId,
				queries: [
					Query.equal("type", type),
					Query.orderDesc("$createdAt"),
					Query.limit(500),
				],
			});
			for (const row of existing.rows) {
				const parsed = parseExpiryNoticeMetadata(
					row.metadata as string | undefined,
				);
				if (parsed) {
					sent.add(
						`${parsed.entityType}:${parsed.entityId}:${parsed.daysUntil}`,
					);
				}
			}
		}),
	);

	return sent;
}

async function loadContractAlertSettingsMap(
	contractIds: string[],
): Promise<
	Map<
		string,
		{
			channels: Set<AlertChannel>;
			recipientIds: string[];
		}
	>
> {
	const map = new Map<
		string,
		{ channels: Set<AlertChannel>; recipientIds: string[] }
	>();
	const tableId =
		appwriteConfig.contractsEnterpriseMetadataCollectionId ||
		appwriteConfig.contractExtensionsCollectionId;

	if (!appwriteConfig.databaseId || !tableId || contractIds.length === 0) {
		return map;
	}

	const { tablesDB } = await createAdminClient();
	const chunkSize = 50;

	for (let i = 0; i < contractIds.length; i += chunkSize) {
		const chunk = contractIds.slice(i, i + chunkSize);
		try {
			const docs = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId,
				queries: [
					Query.or(chunk.map((id) => Query.equal("contractId", id))),
					Query.limit(chunk.length),
				],
			});
			for (const row of docs.rows) {
				const contractId = String(
					(row as { contractId?: string }).contractId || "",
				);
				if (!contractId) continue;
				map.set(contractId, {
					channels: parseAlertChannels(
						(row as { alertChannels?: unknown }).alertChannels ?? null,
					),
					recipientIds: parseAlertRecipientIds(
						(row as { alertRecipientIds?: unknown }).alertRecipientIds ?? null,
					),
				});
			}
		} catch (error) {
			console.warn("Failed to batch-load contract alert settings:", error);
		}
	}

	return map;
}

async function preloadOrganizationTimezones(
	orgIds: string[],
): Promise<Map<string, string>> {
	const unique = [...new Set(orgIds.filter(Boolean))] as string[];
	const map = new Map<string, string>();
	await Promise.all(
		unique.map(async (orgId) => {
			map.set(orgId, await getOrganizationTimezone(orgId));
		}),
	);
	return map;
}

async function mapWithConcurrency<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	limit = 10,
): Promise<R[]> {
	if (items.length === 0) return [];
	const results = new Array<R>(items.length);
	let index = 0;

	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (index < items.length) {
				const current = index++;
				results[current] = await fn(items[current]);
			}
		}),
	);

	return results;
}

type UserRow = {
	$id: string;
	accountId?: string;
	email?: string;
	fullName?: string;
	department?: string;
	phone?: string;
};

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
	actionUrl?: string;
	desktopAlert?: {
		title: string;
		body: string;
		url: string;
		urgent?: boolean;
		tag?: string;
		severity?: "info" | "warning" | "critical";
	};
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
				channels.has("in_app") || channels.has("email") || channels.has("sms");

			if (wantsInApp) {
				const notification = await createNotification({
					userId: user.accountId,
					title: params.title,
					message: params.message,
					type: params.type,
					read: false,
					metadata: params.metadata,
					triggerType: "scheduled",
					actionUrl: params.actionUrl,
					actionText: params.actionUrl ? "View" : undefined,
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

			// Native desktop Web Push (opt-in via Settings → Desktop alerts)
			if (params.desktopAlert) {
				try {
					const { sendDesktopAlert } = await import(
						"@/lib/push/notifications-server"
					);
					await sendDesktopAlert(user.accountId, params.desktopAlert);
				} catch (desktopError) {
					console.warn(
						`Desktop alert failed for user ${user.$id}:`,
						desktopError,
					);
				}
			}
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

		const now = new Date();
		const sentKeys = await loadExpiryNoticeSentKeys([
			"contract-expiry",
			"license-expiry",
			"audit-upcoming",
		]);

		const [contractsResult, licensesResult, auditsResult] = await Promise.all([
			appwriteConfig.contractsCollectionId
				? tablesDB.listRows({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.contractsCollectionId,
						queries: [
							excludeSoftDeletedQuery(),
							Query.isNotNull("contractExpiryDate"),
							Query.limit(1000),
						],
					})
				: Promise.resolve({ rows: [] as Record<string, unknown>[] }),
			appwriteConfig.licensesCollectionId
				? tablesDB.listRows({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.licensesCollectionId,
						queries: [
							excludeSoftDeletedQuery("licenses"),
							Query.isNotNull("licenseExpiryDate"),
							Query.limit(1000),
						],
					})
				: Promise.resolve({ rows: [] as Record<string, unknown>[] }),
			appwriteConfig.auditsCollectionId
				? tablesDB.listRows({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.auditsCollectionId,
						queries: [
							Query.isNotNull("auditExpiryDate"),
							Query.limit(1000),
						],
					})
				: Promise.resolve({ rows: [] as Record<string, unknown>[] }),
		]);

		const orgIds = [
			...contractsResult.rows,
			...licensesResult.rows,
			...auditsResult.rows,
		]
			.map((row) =>
				typeof row.orgId === "string" ? row.orgId : null,
			)
			.filter(Boolean) as string[];

		const timezoneByOrg = await preloadOrganizationTimezones(orgIds);
		const contractAlertSettings = await loadContractAlertSettingsMap(
			contractsResult.rows.map((row) => String(row.$id || "")).filter(Boolean),
		);

		const { buildDesktopExpiryAlert } = await import(
			"@/lib/push/notifications-server"
		);

		type ExpiryJob = () => Promise<number>;

		const contractJobs: ExpiryJob[] = [];
		for (const contract of contractsResult.rows) {
			if (!contract.contractExpiryDate) continue;
			if (contract.status?.toLowerCase() === "expired") continue;
			if (contract.isExpired === true) continue;

			const orgId =
				typeof contract.orgId === "string" ? contract.orgId : null;
			const timeZone = orgId
				? (timezoneByOrg.get(orgId) ?? DEFAULT_ORG_TIMEZONE)
				: DEFAULT_ORG_TIMEZONE;
			const daysUntil = daysUntilExpiry(
				contract.contractExpiryDate as string,
				now,
				timeZone,
			);
			if (!shouldSendExpiryNotice(daysUntil, contract.renewalNoticeDays)) {
				continue;
			}

			const meta: ExpiryNoticeMetadata = {
				entityType: "contract",
				entityId: String(contract.$id),
				daysUntil,
			};
			const sentKey = `${meta.entityType}:${meta.entityId}:${meta.daysUntil}`;
			if (sentKeys.has(sentKey)) continue;

			const departmentLabel = contract.department
				? formatDepartmentName(contract.department as string)
				: "Unknown Department";
			const expirySlice = String(contract.contractExpiryDate).slice(0, 10);
			const autoRenew = contract.autoRenew === true;
			const actionPhrase = autoRenew
				? "is scheduled to auto-renew"
				: "is set to expire";
			const contractName = (contract.contractName as string) || "Untitled";
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
			const alertSettings =
				contractAlertSettings.get(String(contract.$id)) ?? {
					channels: parseAlertChannels(null),
					recipientIds: [],
				};

			contractJobs.push(() =>
				notifyEligibleUsers({
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
					actionUrl: "/contracts",
					desktopAlert: buildDesktopExpiryAlert({
						kind: "contract",
						name: contractName,
						daysUntil,
						expirySlice,
						autoRenew,
						entityId: String(contract.$id),
						url: "/dashboard",
					}),
				}),
			);
		}

		const licenseJobs: ExpiryJob[] = [];
		for (const license of licensesResult.rows) {
			if (!license.licenseExpiryDate) continue;
			if (license.status?.toLowerCase() === "expired") continue;

			const orgId = typeof license.orgId === "string" ? license.orgId : null;
			const timeZone = orgId
				? (timezoneByOrg.get(orgId) ?? DEFAULT_ORG_TIMEZONE)
				: DEFAULT_ORG_TIMEZONE;
			const daysUntil = daysUntilExpiry(
				license.licenseExpiryDate as string,
				now,
				timeZone,
			);
			if (!shouldSendExpiryNotice(daysUntil, license.renewalNoticeDays)) {
				continue;
			}

			const meta: ExpiryNoticeMetadata = {
				entityType: "license",
				entityId: String(license.$id),
				daysUntil,
			};
			const sentKey = `${meta.entityType}:${meta.entityId}:${meta.daysUntil}`;
			if (sentKeys.has(sentKey)) continue;

			const expirySlice = String(license.licenseExpiryDate).slice(0, 10);
			const autoRenew = license.autoRenew === true;
			const actionPhrase = autoRenew
				? "is scheduled to auto-renew"
				: "is set to expire";
			const licenseName = (license.licenseName as string) || "Untitled";
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

			licenseJobs.push(() =>
				notifyEligibleUsers({
					title,
					message,
					smsMessage,
					type: "license-expiry",
					metadata: buildExpiryNoticeMetadata(meta),
					viewPermission: PERMISSIONS.LICENSES.VIEW,
					matchDepartmentOnly: false,
					channels: parseAlertChannels(null),
					actionUrl: "/licenses",
					desktopAlert: buildDesktopExpiryAlert({
						kind: "license",
						name: licenseName,
						daysUntil,
						expirySlice,
						entityId: String(license.$id),
						url: "/licenses",
					}),
				}),
			);
		}

		const auditJobs: ExpiryJob[] = [];
		for (const audit of auditsResult.rows) {
			if (!audit.auditExpiryDate) continue;

			const orgId = typeof audit.orgId === "string" ? audit.orgId : null;
			const timeZone = orgId
				? (timezoneByOrg.get(orgId) ?? DEFAULT_ORG_TIMEZONE)
				: DEFAULT_ORG_TIMEZONE;
			const daysUntil = daysUntilExpiry(
				audit.auditExpiryDate as string,
				now,
				timeZone,
			);
			if (!shouldSendExpiryNotice(daysUntil, audit.renewalNoticeDays)) {
				continue;
			}

			const meta: ExpiryNoticeMetadata = {
				entityType: "audit",
				entityId: String(audit.$id),
				daysUntil,
			};
			const sentKey = `${meta.entityType}:${meta.entityId}:${meta.daysUntil}`;
			if (sentKeys.has(sentKey)) continue;

			const expirySlice = String(audit.auditExpiryDate).slice(0, 10);
			const auditName = (audit.auditName as string) || "Untitled";
			const title = "Upcoming Audit Reminder";
			const message = `The audit "${auditName}" is due in ${daysUntil} days (on ${expirySlice}).`;
			const smsMessage = buildExpirySmsMessage({
				entityLabel: "Audit",
				name: auditName,
				daysUntil,
				expirySlice,
				autoRenew: false,
			});

			auditJobs.push(() =>
				notifyEligibleUsers({
					title,
					message,
					smsMessage,
					type: "audit-upcoming",
					metadata: buildExpiryNoticeMetadata(meta),
					viewPermission: PERMISSIONS.AUDIT.VIEW,
					matchDepartmentOnly: false,
					channels: parseAlertChannels(null),
					actionUrl: "/audits",
					desktopAlert: buildDesktopExpiryAlert({
						kind: "audit",
						name: auditName,
						daysUntil,
						expirySlice,
						entityId: String(audit.$id),
						url: "/audits",
					}),
				}),
			);
		}

		const jobResults = await mapWithConcurrency(
			[...contractJobs, ...licenseJobs, ...auditJobs],
			(job) => job(),
			10,
		);
		const notificationsCreated = jobResults.reduce((sum, n) => sum + n, 0);

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
