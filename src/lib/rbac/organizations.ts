/**
 * Organization Management Functions
 * Multi-tenant organization management
 */

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type BillingStatus =
	| "active"
	| "trialing"
	| "past_due"
	| "canceled"
	| "none";

export type BillingInterval = "monthly" | "yearly";

export interface Organization {
	$id: string;
	name: string;
	domain?: string;
	subscriptionTier: "starter" | "growth" | "enterprise";
	status: "active" | "suspended" | "trial";
	settings: {
		maxUsers: number;
		maxDepartments: number;
		features: string[];
		isDemo?: boolean;
		expiresAt?: string;
		ownerEmail?: string;
		[key: string]: unknown;
	};
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
	stripePriceId?: string;
	billingStatus?: BillingStatus;
	billingInterval?: BillingInterval;
	currentPeriodEnd?: string;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
}

/**
 * Create a new organization
 */
export async function createOrganization({
	name,
	domain,
	subscriptionTier = "starter",
	status = "active",
	settings = {
		maxUsers: 10,
		maxDepartments: 3,
		features: [],
	},
	createdBy,
}: {
	name: string;
	domain?: string;
	subscriptionTier?: "starter" | "growth" | "enterprise";
	status?: "active" | "suspended" | "trial";
	settings?: {
		maxUsers: number;
		maxDepartments: number;
		features: string[];
		/** Demo sandbox metadata (stored inside settings JSON) */
		isDemo?: boolean;
		expiresAt?: string;
		ownerEmail?: string;
		[key: string]: unknown;
	};
	createdBy: string;
}): Promise<Organization> {
	const { tablesDB } = await createAdminClient();

	const org = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "organizations",
		rowId: ID.unique(),
		data: {
			name,
			domain: domain || "",
			subscriptionTier,
			status,
			settings: JSON.stringify(settings),
			createdBy,
		},
	});

	return {
		...org,
		settings:
			typeof org.settings === "string"
				? JSON.parse(org.settings)
				: org.settings,
	} as unknown as Organization;
}

/**
 * Get organization by ID
 */
export async function getOrganization(
	orgId: string,
): Promise<Organization | null> {
	try {
		const { tablesDB } = await createAdminClient();

		const org = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "organizations",
			rowId: orgId,
		});

		return {
			...org,
			settings:
				typeof org.settings === "string"
					? JSON.parse(org.settings)
					: org.settings,
		} as unknown as Organization;
	} catch (error) {
		console.error("[getOrganization] Error:", error);
		return null;
	}
}

/**
 * List all organizations
 */
export async function listOrganizations(): Promise<Organization[]> {
	const { tablesDB } = await createAdminClient();

	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "organizations",
		queries: [],
	});

	return result.rows.map((org: any) => ({
		...org,
		settings:
			typeof org.settings === "string"
				? JSON.parse(org.settings)
				: org.settings,
	})) as unknown as Organization[];
}

/**
 * Update organization
 */
export async function updateOrganization(
	orgId: string,
	updates: {
		name?: string;
		domain?: string;
		subscriptionTier?: "starter" | "growth" | "enterprise";
		status?: "active" | "suspended" | "trial";
		settings?: {
			maxUsers: number;
			maxDepartments: number;
			features: string[];
			[key: string]: unknown;
		};
	},
): Promise<Organization | null> {
	try {
		const { tablesDB } = await createAdminClient();

		const updateData: any = {};
		if (updates.name !== undefined) updateData.name = updates.name;
		if (updates.domain !== undefined) updateData.domain = updates.domain;
		if (updates.subscriptionTier !== undefined)
			updateData.subscriptionTier = updates.subscriptionTier;
		if (updates.status !== undefined) updateData.status = updates.status;
		if (updates.settings !== undefined)
			updateData.settings = JSON.stringify(updates.settings);

		const org = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "organizations",
			rowId: orgId,
			data: updateData,
		});

		return {
			...org,
			settings:
				typeof org.settings === "string"
					? JSON.parse(org.settings)
					: org.settings,
		} as unknown as Organization;
	} catch (error) {
		console.error("[updateOrganization] Error:", error);
		return null;
	}
}

/**
 * Update organization Stripe billing fields (webhook / checkout source of truth)
 */
export async function updateOrganizationBilling(
	orgId: string,
	updates: {
		stripeCustomerId?: string;
		stripeSubscriptionId?: string;
		stripePriceId?: string;
		billingStatus?: BillingStatus;
		billingInterval?: BillingInterval;
		subscriptionTier?: "starter" | "growth" | "enterprise";
		currentPeriodEnd?: string;
	},
): Promise<Organization | null> {
	try {
		const { tablesDB } = await createAdminClient();

		const updateData: Record<string, string> = {};
		if (updates.stripeCustomerId !== undefined)
			updateData.stripeCustomerId = updates.stripeCustomerId;
		if (updates.stripeSubscriptionId !== undefined)
			updateData.stripeSubscriptionId = updates.stripeSubscriptionId;
		if (updates.stripePriceId !== undefined)
			updateData.stripePriceId = updates.stripePriceId;
		if (updates.billingStatus !== undefined)
			updateData.billingStatus = updates.billingStatus;
		if (updates.billingInterval !== undefined)
			updateData.billingInterval = updates.billingInterval;
		if (updates.subscriptionTier !== undefined)
			updateData.subscriptionTier = updates.subscriptionTier;
		if (updates.currentPeriodEnd !== undefined)
			updateData.currentPeriodEnd = updates.currentPeriodEnd;

		const org = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "organizations",
			rowId: orgId,
			data: updateData,
		});

		return {
			...org,
			settings:
				typeof org.settings === "string"
					? JSON.parse(org.settings as string)
					: org.settings,
		} as unknown as Organization;
	} catch (error) {
		console.error("[updateOrganizationBilling] Error:", error);
		return null;
	}
}

/**
 * Add user to organization
 */
export async function addUserToOrganization({
	userId,
	orgId,
	orgRole = "member",
	isDefault = false,
	invitedBy,
}: {
	userId: string;
	orgId: string;
	orgRole?: "owner" | "admin" | "member";
	isDefault?: boolean;
	invitedBy?: string;
}): Promise<boolean> {
	try {
		const { tablesDB } = await createAdminClient();

		// Check if user is already in organization
		const existing = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "user_organizations",
			queries: [Query.equal("userId", userId), Query.equal("orgId", orgId)],
		});

		if (existing.total > 0) {
			// Update existing relationship
			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_organizations",
				rowId: existing.rows[0].$id,
				data: {
					orgRole,
					isDefault,
					invitedBy: invitedBy || "",
				},
			});
			return true;
		}

		// If setting as default, unset other defaults for this user
		if (isDefault) {
			const userOrgs = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_organizations",
				queries: [Query.equal("userId", userId)],
			});

			for (const uo of userOrgs.rows) {
				if (uo.isDefault) {
					await tablesDB.updateRow({
						databaseId: appwriteConfig.databaseId || "default-db",
						tableId: "user_organizations",
						rowId: uo.$id,
						data: { isDefault: false },
					});
				}
			}
		}

		// Create new relationship
		await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "user_organizations",
			rowId: ID.unique(),
			data: {
				userId,
				orgId,
				orgRole,
				isDefault,
				invitedBy: invitedBy || "",
			},
		});

		return true;
	} catch (error) {
		console.error("[addUserToOrganization] Error:", error);
		return false;
	}
}

/**
 * Remove user from organization
 */
export async function removeUserFromOrganization(
	userId: string,
	orgId: string,
): Promise<boolean> {
	try {
		const { tablesDB } = await createAdminClient();

		const userOrgs = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "user_organizations",
			queries: [Query.equal("userId", userId), Query.equal("orgId", orgId)],
		});

		for (const uo of userOrgs.rows) {
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_organizations",
				rowId: uo.$id,
			});
		}

		// Also remove all role assignments for this user in this organization
		const userRoles = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "user_roles",
			queries: [Query.equal("userId", userId), Query.equal("orgId", orgId)],
		});

		for (const ur of userRoles.rows) {
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_roles",
				rowId: ur.$id,
			});
		}

		return true;
	} catch (error) {
		console.error("[removeUserFromOrganization] Error:", error);
		return false;
	}
}
