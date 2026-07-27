/**
 * Per-visitor demo sandbox provisioning.
 * Only runs when APP_MODE=demo (never against production).
 */

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	assertDemoNotUsingProdDatabase,
	getDemoOrgExpiresAt,
	isDemoMode,
} from "@/lib/config/demo-mode";
import { seedDemoOrgData } from "@/lib/demo/seed-org-data";
import {
	addUserToOrganization,
	createOrganization,
	updateOrganizationBilling,
} from "@/lib/rbac/organizations";

export interface ProvisionSandboxResult {
	orgId: string;
	dashboardPath: string;
	reused: boolean;
}

function parseOrgSettings(raw: unknown): Record<string, unknown> {
	if (typeof raw === "string") {
		try {
			return JSON.parse(raw) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	if (raw && typeof raw === "object") {
		return raw as Record<string, unknown>;
	}
	return {};
}

/**
 * Find an existing non-expired demo org owned by this email.
 */
async function findExistingDemoOrg(
	email: string,
): Promise<{ orgId: string } | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "organizations",
		queries: [Query.limit(100)],
	});

	const now = Date.now();
	for (const row of result.rows) {
		const settings = parseOrgSettings(row.settings);
		if (
			settings.isDemo === true &&
			settings.ownerEmail === email.toLowerCase()
		) {
			const expiresAt = settings.expiresAt;
			if (typeof expiresAt === "string" && Date.parse(expiresAt) > now) {
				return { orgId: row.$id };
			}
		}
	}
	return null;
}

async function getOrganizationAdminRoleId(): Promise<string> {
	const { tablesDB } = await createAdminClient();
	const rolesResult = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "roles",
		queries: [Query.equal("name", "Organization Admin"), Query.limit(1)],
	});

	if (rolesResult.total === 0 || !rolesResult.rows[0]) {
		throw new Error(
			"Organization Admin role not found. Seed roles in the demo Appwrite project first.",
		);
	}
	return rolesResult.rows[0].$id;
}

async function assignOrgAdminRole(
	userId: string,
	orgId: string,
	roleId: string,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "user_roles",
		queries: [
			Query.equal("userId", userId),
			Query.equal("orgId", orgId),
			Query.equal("roleId", roleId),
			Query.limit(1),
		],
	});

	if (existing.total > 0) {
		return;
	}

	await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "user_roles",
		rowId: ID.unique(),
		data: {
			userId,
			orgId,
			roleId,
			assignedBy: userId,
		},
	});
}

/**
 * Create (or reuse) a per-visitor demo org, link the user, assign Org Admin, seed data.
 */
export async function provisionDemoSandbox({
	userId,
	email,
	fullName,
}: {
	userId: string;
	email: string;
	fullName: string;
}): Promise<ProvisionSandboxResult> {
	if (!isDemoMode()) {
		throw new Error("provisionDemoSandbox can only run when APP_MODE=demo");
	}
	assertDemoNotUsingProdDatabase();

	const existing = await findExistingDemoOrg(email);
	if (existing) {
		await addUserToOrganization({
			userId,
			orgId: existing.orgId,
			orgRole: "owner",
			isDefault: true,
		});
		const roleId = await getOrganizationAdminRoleId();
		await assignOrgAdminRole(userId, existing.orgId, roleId);
		return {
			orgId: existing.orgId,
			dashboardPath: "/dashboard/organizationadmin",
			reused: true,
		};
	}

	const firstName = fullName.trim().split(/\s+/)[0] || "Visitor";
	const org = await createOrganization({
		name: `${firstName}'s Acme Compliance (Demo)`,
		subscriptionTier: "enterprise",
		status: "trial",
		settings: {
			maxUsers: 50,
			maxDepartments: 20,
			features: ["all"],
			isDemo: true,
			expiresAt: getDemoOrgExpiresAt(),
			ownerEmail: email.toLowerCase(),
		},
		createdBy: userId,
	});

	await updateOrganizationBilling(org.$id, {
		billingStatus: "active",
	});

	const linked = await addUserToOrganization({
		userId,
		orgId: org.$id,
		orgRole: "owner",
		isDefault: true,
	});
	if (!linked) {
		throw new Error("Failed to link user to demo organization");
	}

	const roleId = await getOrganizationAdminRoleId();
	await assignOrgAdminRole(userId, org.$id, roleId);

	await seedDemoOrgData({
		orgId: org.$id,
		userId,
		ownerEmail: email,
		ownerName: fullName,
	});

	return {
		orgId: org.$id,
		dashboardPath: "/dashboard/organizationadmin",
		reused: false,
	};
}
