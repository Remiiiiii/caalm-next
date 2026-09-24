import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { flattenTableRow } from "@/lib/appwrite/flatten-row";
import { getOrganization } from "@/lib/rbac/organizations";
import CacheManager from "@/lib/services/cache-manager";
import { shouldSyncManagerUserIdOnReassign } from "@/lib/users/manager-user-id-source";
import { reportingWouldCycle } from "@/lib/users/reporting-graph";

export class ReassignManagerError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "ReassignManagerError";
		this.status = status;
	}
}

function db() {
	return appwriteConfig.databaseId || "default-db";
}

function usersTable() {
	return appwriteConfig.usersCollectionId || "users";
}

async function getUserRow(userId: string) {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: db(),
			tableId: usersTable(),
			rowId: userId,
		});
		return flattenTableRow(row as Record<string, unknown>);
	} catch {
		const listed = await tablesDB.listRows({
			databaseId: db(),
			tableId: usersTable(),
			queries: [Query.equal("accountId", userId), Query.limit(1)],
		});
		if (!listed.rows[0]) return null;
		return flattenTableRow(listed.rows[0] as Record<string, unknown>);
	}
}

function isClearManager(raw: string): boolean {
	const value = raw.trim().toLowerCase();
	return !value || value === "system" || value === "null";
}

/**
 * Set or clear users.managerUserId. Does not touch assignedBy.
 */
export async function reassignManager(input: {
	targetUserId: string;
	managerUserId: string | null;
}): Promise<{ managerUserId: string | null }> {
	const managerRaw = String(input.managerUserId || "").trim();
	const clearManager = isClearManager(managerRaw);
	const { tablesDB } = await createAdminClient();

	const target = await getUserRow(input.targetUserId);
	if (!target?.$id) {
		throw new ReassignManagerError("User not found", 404);
	}
	const targetId = String(target.$id);
	const targetAccountId = String(target.accountId || "");
	const orgId = String(target.orgId || "");
	if (!orgId) {
		throw new ReassignManagerError("User is missing an organization", 400);
	}

	const org = await getOrganization(orgId);
	const managerSource = org?.settings?.managerUserId_source;
	if (!shouldSyncManagerUserIdOnReassign(managerSource)) {
		throw new ReassignManagerError(
			managerSource === "scim"
				? "Manager is owned by SCIM for this organization"
				: "Manager updates are disabled until this organization sets manager source to manual",
			409,
		);
	}

	let nextManagerId: string | null = null;
	if (!clearManager) {
		const manager = await getUserRow(managerRaw);
		if (!manager?.$id) {
			throw new ReassignManagerError("Manager not found", 404);
		}
		nextManagerId = String(manager.$id);
		if (nextManagerId === targetId) {
			throw new ReassignManagerError("A user cannot report to themselves");
		}
		if (String(manager.orgId || "") !== orgId) {
			throw new ReassignManagerError(
				"Manager must belong to the same organization",
			);
		}
	}

	const orgUsers = await tablesDB.listRows({
		databaseId: db(),
		tableId: usersTable(),
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});

	const profileIds = new Set<string>();
	const accountToProfile = new Map<string, string>();
	for (const row of orgUsers.rows) {
		const profileId = String((row as { $id?: string }).$id || "");
		if (!profileId) continue;
		profileIds.add(profileId);
		const accountId = String((row as { accountId?: string }).accountId || "");
		if (accountId) accountToProfile.set(accountId, profileId);
	}

	const toProfileId = (raw: string): string | null => {
		if (!raw) return null;
		if (profileIds.has(raw)) return raw;
		return accountToProfile.get(raw) ?? null;
	};

	const parentOf = new Map<string, string>();
	for (const row of orgUsers.rows) {
		const childId = String((row as { $id?: string }).$id || "");
		if (!childId || childId === targetId) continue;
		const managerId = toProfileId(
			String((row as { managerUserId?: string | null }).managerUserId || ""),
		);
		if (managerId) parentOf.set(childId, managerId);
	}

	if (
		nextManagerId &&
		reportingWouldCycle(nextManagerId, targetId, parentOf)
	) {
		throw new ReassignManagerError(
			"That connection would create a circular reporting chain",
		);
	}

	await tablesDB.updateRow({
		databaseId: db(),
		tableId: usersTable(),
		rowId: targetId,
		data: { managerUserId: nextManagerId },
	});

	await CacheManager.invalidateUsers(
		String(target.email || "") || undefined,
		targetId,
		targetAccountId || undefined,
		String(target.fullName || "") || undefined,
	);

	return { managerUserId: nextManagerId };
}
