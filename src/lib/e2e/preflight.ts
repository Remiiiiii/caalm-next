/**
 * Playwright / CI preflight: verify Appwrite rows and RBAC the billing E2E suite needs.
 * Fails fast with actionable errors instead of timing out on "access denied" in the UI.
 */

import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserPermissions } from "@/lib/rbac/permissions";

export const DEFAULT_E2E_ORG_ID = "default_organization";

export type E2EPreflightCheck = {
	name: string;
	ok: boolean;
	detail?: string;
};

export type E2EPreflightResult = {
	ok: boolean;
	checks: E2EPreflightCheck[];
};

async function checkPermissionsTable(): Promise<E2EPreflightCheck> {
	const tableId =
		appwriteConfig.permissionsCollectionId || "685ed87c0009d8189fc8";
	const databaseId = appwriteConfig.databaseId || "default-db";

	try {
		const { tablesDB } = await createAdminClient();
		await tablesDB.listRows({
			databaseId,
			tableId,
			queries: [Query.limit(1)],
		});
		return { name: "permissions_table", ok: true };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown Appwrite error";
		return {
			name: "permissions_table",
			ok: false,
			detail: `Could not read permissions table "${tableId}". Set NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION to the permissions table id (not role_permissions). ${message}`,
		};
	}
}

async function checkRolePermissionsTable(): Promise<E2EPreflightCheck> {
	const databaseId = appwriteConfig.databaseId || "default-db";

	try {
		const { tablesDB } = await createAdminClient();
		await tablesDB.listRows({
			databaseId,
			tableId: "role_permissions",
			queries: [Query.limit(1)],
		});
		return { name: "role_permissions_table", ok: true };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown Appwrite error";
		return {
			name: "role_permissions_table",
			ok: false,
			detail: `Could not read role_permissions table. ${message}`,
		};
	}
}

export async function runE2EPreflight(
	e2eUserId: string,
): Promise<E2EPreflightResult> {
	const checks: E2EPreflightCheck[] = [];

	if (!e2eUserId) {
		checks.push({
			name: "playwright_e2e_user_id",
			ok: false,
			detail:
				"PLAYWRIGHT_E2E_USER_ID is missing. Set it in .env.local and GitHub Actions secrets.",
		});
		return { ok: false, checks };
	}

	checks.push({
		name: "playwright_e2e_user_id",
		ok: true,
	});

	const org = await getOrganization(DEFAULT_E2E_ORG_ID);
	checks.push({
		name: "default_organization",
		ok: Boolean(org),
		detail: org
			? undefined
			: `organizations row "${DEFAULT_E2E_ORG_ID}" not found. Seed prod/dev Appwrite or run getOrCreateDefaultOrganization.`,
	});

	checks.push(await checkPermissionsTable());
	checks.push(await checkRolePermissionsTable());

	if (org) {
		const permissions = await getUserPermissions(
			e2eUserId,
			DEFAULT_E2E_ORG_ID,
		);
		const hasBilling = permissions.includes(PERMISSIONS.SETTINGS.BILLING);
		checks.push({
			name: "settings.billing",
			ok: hasBilling,
			detail: hasBilling
				? undefined
				: `E2E user has ${permissions.length} permission(s) but not settings.billing. Assign Super Admin (or settings.billing) via user_roles + role_permissions in Appwrite — do not hardcode bypasses.`,
		});
	}

	return {
		ok: checks.every((check) => check.ok),
		checks,
	};
}
