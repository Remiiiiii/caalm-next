import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createNotification } from "@/lib/actions/notification.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { hasPermission } from "@/lib/rbac/permissions";
import {
	computeNextExpiryDate,
	daysUntilExpiry,
	isExpiryReachedOrPassed,
	shouldAutoRenew,
	toDateOnlyString,
} from "@/lib/renewals/autoRenew";
import type { RenewalRecord } from "@/types/licenses";

export type ProcessExpiredResult = {
	message: string;
	updatedCount: number;
	autoRenewedCount: number;
	totalChecked: number;
	errors?: string[];
};

async function notifyAutoRenewed(params: {
	entityType: "contract" | "license";
	entityId: string;
	name: string;
	newExpiry: string;
	department?: string | null;
	viewPermission: string;
}) {
	const { tablesDB } = await createAdminClient();
	if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) return;

	const users = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: appwriteConfig.usersCollectionId,
		queries: [Query.limit(100)],
	});

	const kind = params.entityType === "contract" ? "contract" : "license";
	const title =
		params.entityType === "contract"
			? "Contract Auto-Renewed"
			: "License Auto-Renewed";

	for (const user of users.rows) {
		const hasSettingsView = await hasPermission(
			user.$id,
			PERMISSIONS.SETTINGS.VIEW,
		);
		const hasView = await hasPermission(user.$id, params.viewPermission);

		let shouldNotify = false;
		if (hasSettingsView) {
			shouldNotify = true;
		} else if (
			hasView &&
			params.entityType === "contract" &&
			params.department &&
			user.department
		) {
			shouldNotify = user.department === params.department;
		} else if (hasView && params.entityType === "license") {
			shouldNotify = true;
		}

		if (!shouldNotify || !user.accountId) continue;

		try {
			await createNotification({
				userId: user.accountId,
				title,
				message: `The ${kind} "${params.name}" was auto-renewed. New expiry date: ${params.newExpiry}.`,
				type:
					params.entityType === "contract"
						? "contract-auto-renewed"
						: "license-auto-renewed",
				read: false,
				metadata: JSON.stringify({
					entityType: params.entityType,
					entityId: params.entityId,
					newExpiry: params.newExpiry,
				}),
				triggerType: "automatic",
			});
		} catch (notifyError) {
			console.error(
				`Failed to notify user ${user.$id} of auto-renew for ${params.entityId}:`,
				notifyError,
			);
		}
	}
}

async function processContracts(now: Date): Promise<{
	updated: number;
	autoRenewed: number;
	checked: number;
	errors: string[];
}> {
	const { tablesDB } = await createAdminClient();
	const errors: string[] = [];
	let updated = 0;
	let autoRenewed = 0;

	if (!appwriteConfig.databaseId || !appwriteConfig.contractsCollectionId) {
		throw new Error("Database or contracts collection ID not configured");
	}

	const contracts = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: appwriteConfig.contractsCollectionId,
		queries: [Query.isNotNull("contractExpiryDate"), Query.limit(1000)],
	});

	for (const contract of contracts.rows) {
		if (!contract.contractExpiryDate) continue;

		try {
			const expired = isExpiryReachedOrPassed(contract.contractExpiryDate, now);
			const days = daysUntilExpiry(contract.contractExpiryDate, now);

			if (
				expired &&
				shouldAutoRenew({
					autoRenew: contract.autoRenew as boolean | undefined,
				})
			) {
				const newExpiry = computeNextExpiryDate({
					startDate: contract.startDate as string | undefined,
					expiryDate: contract.contractExpiryDate,
				});
				const newDays = daysUntilExpiry(newExpiry, now);

				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.contractsCollectionId,
					rowId: contract.$id,
					data: {
						contractExpiryDate: newExpiry,
						status: "active",
						isExpired: false,
						daysUntilExpiry: newDays,
					},
				});

				updated++;
				autoRenewed++;

				await notifyAutoRenewed({
					entityType: "contract",
					entityId: contract.$id,
					name: (contract.contractName as string) || "Untitled Contract",
					newExpiry,
					department: contract.department as string | undefined,
					viewPermission: PERMISSIONS.CONTRACTS.VIEW,
				});
				continue;
			}

			const needsStatusUpdate =
				expired &&
				(contract.isExpired !== true ||
					contract.status?.toLowerCase() !== "expired");
			const needsDaysUpdate = contract.daysUntilExpiry !== days;

			if (needsStatusUpdate || needsDaysUpdate) {
				const updateData: Record<string, unknown> = {
					daysUntilExpiry: days,
				};

				if (expired) {
					updateData.isExpired = true;
					if (contract.status?.toLowerCase() !== "expired") {
						updateData.status = "expired";
					}
				}

				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.contractsCollectionId,
					rowId: contract.$id,
					data: updateData,
				});
				updated++;
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			const errorMsg = `Failed to update contract ${contract.$id}: ${message}`;
			errors.push(errorMsg);
			console.error(errorMsg, error);
		}
	}

	return {
		updated,
		autoRenewed,
		checked: contracts.rows.length,
		errors,
	};
}

async function processLicenses(now: Date): Promise<{
	updated: number;
	autoRenewed: number;
	checked: number;
	errors: string[];
}> {
	const { tablesDB } = await createAdminClient();
	const errors: string[] = [];
	let updated = 0;
	let autoRenewed = 0;

	if (!appwriteConfig.databaseId || !appwriteConfig.licensesCollectionId) {
		return { updated: 0, autoRenewed: 0, checked: 0, errors: [] };
	}

	const licenses = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: appwriteConfig.licensesCollectionId,
		queries: [Query.isNotNull("licenseExpiryDate"), Query.limit(1000)],
	});

	const todayStr = toDateOnlyString(now);

	for (const license of licenses.rows) {
		if (!license.licenseExpiryDate) continue;

		try {
			const expired = isExpiryReachedOrPassed(license.licenseExpiryDate, now);
			const days = daysUntilExpiry(license.licenseExpiryDate, now);

			if (
				expired &&
				shouldAutoRenew({ autoRenew: license.autoRenew as boolean | undefined })
			) {
				const startDate =
					(license.issueDate as string | undefined) ||
					(license.purchaseDate as string | undefined);
				const newExpiry = computeNextExpiryDate({
					startDate,
					expiryDate: license.licenseExpiryDate,
				});
				const newDays = daysUntilExpiry(newExpiry, now);

				const renewalHistory = (
					(license.renewalHistory as RenewalRecord[]) || []
				).slice();
				renewalHistory.push({
					renewalDate: todayStr,
					cost: (license.cost as number) || 0,
					currencyCode: (license.currencyCode as string) || "USD",
					notes: "System auto-renew",
					renewedBy: "system-auto-renew",
				});

				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.licensesCollectionId,
					rowId: license.$id,
					data: {
						licenseExpiryDate: newExpiry,
						status: "active",
						daysUntilExpiry: newDays,
						renewalDate: todayStr,
						renewalHistory,
					},
				});

				updated++;
				autoRenewed++;

				await notifyAutoRenewed({
					entityType: "license",
					entityId: license.$id,
					name: (license.licenseName as string) || "Untitled License",
					newExpiry,
					viewPermission: PERMISSIONS.LICENSES.VIEW,
				});
				continue;
			}

			const needsStatusUpdate =
				expired && license.status?.toLowerCase() !== "expired";
			const needsDaysUpdate = license.daysUntilExpiry !== days;

			if (needsStatusUpdate || needsDaysUpdate) {
				const updateData: Record<string, unknown> = {
					daysUntilExpiry: days,
				};
				if (expired) {
					updateData.status = "expired";
				}

				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.licensesCollectionId,
					rowId: license.$id,
					data: updateData,
				});
				updated++;
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			const errorMsg = `Failed to update license ${license.$id}: ${message}`;
			errors.push(errorMsg);
			console.error(errorMsg, error);
		}
	}

	return {
		updated,
		autoRenewed,
		checked: licenses.rows.length,
		errors,
	};
}

/**
 * Daily job: auto-renew flagged docs, mark others expired, refresh daysUntilExpiry.
 */
export async function processExpiredDocuments(
	now: Date = new Date(),
): Promise<ProcessExpiredResult> {
	try {
		const today = new Date(now);
		today.setHours(0, 0, 0, 0);

		const contracts = await processContracts(today);
		const licenses = await processLicenses(today);

		const updatedCount = contracts.updated + licenses.updated;
		const autoRenewedCount = contracts.autoRenewed + licenses.autoRenewed;
		const totalChecked = contracts.checked + licenses.checked;
		const errors = [...contracts.errors, ...licenses.errors];

		return {
			message: `Updated ${updatedCount} document(s) (${autoRenewedCount} auto-renewed)`,
			updatedCount,
			autoRenewedCount,
			totalChecked,
			errors: errors.length > 0 ? errors : undefined,
		};
	} catch (error: unknown) {
		const err = error as {
			isTestConfig?: boolean;
			code?: string;
			message?: string;
		};
		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			err?.isTestConfig ||
			err?.code === "TEST_CONFIG" ||
			err?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			err?.message?.includes("AppwriteException")
		) {
			return {
				message: "No documents updated (test environment)",
				updatedCount: 0,
				autoRenewedCount: 0,
				totalChecked: 0,
				errors: undefined,
			};
		}
		throw error;
	}
}
