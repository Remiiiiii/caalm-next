import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { flattenTableRow } from "@/lib/appwrite/flatten-row";
import {
	normalizeOrgPlacement,
	OrgUnitValidationError,
} from "@/lib/org/org-unit-validation";
import { getOrganization } from "@/lib/rbac/organizations";
import CacheManager from "@/lib/services/cache-manager";
import {
	isSystemAssigner,
	SYSTEM_NODE_ID,
	wouldCreateCycle,
} from "@/lib/users/assignment-graph";
import { shouldSyncManagerUserIdOnReassign } from "@/lib/users/manager-user-id-source";

export class ReassignAssignerError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "ReassignAssignerError";
		this.status = status;
	}
}

export type ReassignUserPatch = {
	department?: string;
	division?: string;
	departmentLabel?: string;
	divisionLabel?: string;
	managerUserId?: string | null;
};

/**
 * Pure reconnect payload. Org copy always (except System). managerUserId
 * only when the org owns that field.
 */
export function buildReassignUserPatch(input: {
	assignerIsSystem: boolean;
	assignerUserId: string;
	assignerDepartment?: string | null;
	assignerDivision?: string | null;
	managerSource: unknown;
}): { patch: ReassignUserPatch; skippedManager: boolean } {
	const patch: ReassignUserPatch = {};

	if (!input.assignerIsSystem) {
		try {
			const placement = normalizeOrgPlacement({
				department: input.assignerDepartment,
				division: input.assignerDivision,
				requireDepartment: Boolean(input.assignerDepartment?.trim()),
			});
			if (placement.department) {
				patch.department = placement.department;
				patch.departmentLabel = placement.department;
			}
			if (placement.division) {
				patch.division = placement.division;
				patch.divisionLabel = placement.division;
			}
		} catch (error) {
			if (!(error instanceof OrgUnitValidationError)) throw error;
			// Copy raw values when they are custom labels normalize rejects.
			if (input.assignerDepartment?.trim()) {
				patch.department = input.assignerDepartment.trim();
				patch.departmentLabel = input.assignerDepartment.trim();
			}
			if (input.assignerDivision?.trim()) {
				patch.division = input.assignerDivision.trim();
				patch.divisionLabel = input.assignerDivision.trim();
			}
		}
	}

	const syncManager = shouldSyncManagerUserIdOnReassign(input.managerSource);
	if (syncManager) {
		patch.managerUserId = input.assignerIsSystem ? null : input.assignerUserId;
	}

	return { patch, skippedManager: !syncManager };
}

export function assignmentWouldCycle(
	targetUserId: string,
	assignerUserId: string,
	parentOf: Map<string, string>,
): boolean {
	if (!assignerUserId || assignerUserId === SYSTEM_NODE_ID) return false;
	if (assignerUserId === targetUserId) return true;
	return wouldCreateCycle(assignerUserId, targetUserId, parentOf);
}

type RoleMeta = { name: string; priority: number };

function pickPrimaryRoleRow<
	T extends { roleId: string; assignedAt?: string; $createdAt?: string },
>(rows: T[], rolesById: Map<string, RoleMeta>): T | undefined {
	if (rows.length === 0) return undefined;
	return [...rows].sort((a, b) => {
		const aPriority = rolesById.get(a.roleId)?.priority ?? 9999;
		const bPriority = rolesById.get(b.roleId)?.priority ?? 9999;
		if (aPriority !== bPriority) return aPriority - bPriority;
		const aTs = a.assignedAt || a.$createdAt || "";
		const bTs = b.assignedAt || b.$createdAt || "";
		return bTs.localeCompare(aTs);
	})[0];
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

/**
 * Reconnect target user's primary assignedBy to assignerUserId ("system" to disconnect).
 */
export async function reassignAssigner(input: {
	targetUserId: string;
	assignerUserId: string;
}): Promise<{
	assignedById: string;
	managerUpdated: boolean;
}> {
	const assignerRaw = String(input.assignerUserId || "").trim();
	const assignerIsSystem = isSystemAssigner(assignerRaw, assignerRaw);
	const { tablesDB } = await createAdminClient();

	const target = await getUserRow(input.targetUserId);
	if (!target?.$id) {
		throw new ReassignAssignerError("User not found", 404);
	}
	const targetId = String(target.$id);
	const targetAccountId = String(target.accountId || "");
	const orgId = String(target.orgId || "");
	if (!orgId) {
		throw new ReassignAssignerError("User is missing an organization", 400);
	}

	let assignerId = SYSTEM_NODE_ID;
	let assignerDepartment: string | null = null;
	let assignerDivision: string | null = null;
	if (!assignerIsSystem) {
		const assigner = await getUserRow(assignerRaw);
		if (!assigner?.$id) {
			throw new ReassignAssignerError("Assigner not found", 404);
		}
		assignerId = String(assigner.$id);
		if (assignerId === targetId) {
			throw new ReassignAssignerError(
				"A user cannot be assigned by themselves",
			);
		}
		if (String(assigner.orgId || "") !== orgId) {
			throw new ReassignAssignerError(
				"Assigner must belong to the same organization",
			);
		}
		assignerDepartment = (assigner.department as string | undefined) || null;
		assignerDivision = (assigner.division as string | undefined) || null;
	}

	const [roleRows, rolesResult, orgUsers] = await Promise.all([
		tablesDB.listRows({
			databaseId: db(),
			tableId: "user_roles",
			queries: [Query.equal("orgId", orgId), Query.limit(500)],
		}),
		tablesDB.listRows({
			databaseId: db(),
			tableId: "roles",
			queries: [Query.limit(500)],
		}),
		tablesDB.listRows({
			databaseId: db(),
			tableId: usersTable(),
			queries: [Query.equal("orgId", orgId), Query.limit(500)],
		}),
	]);

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

	const rolesById = new Map<string, RoleMeta>();
	for (const role of rolesResult.rows) {
		const roleId = String((role as { $id?: string }).$id || "");
		if (!roleId) continue;
		const dbPriority = (role as { priority?: number }).priority;
		rolesById.set(roleId, {
			name: String((role as { name?: string }).name || ""),
			priority: typeof dbPriority === "number" ? dbPriority : 9999,
		});
	}

	const parentOf = new Map<string, string>();
	const targetCandidateIds = new Set(
		[targetId, targetAccountId].filter(Boolean),
	);
	const targetRoleRows: Array<{
		$id: string;
		roleId: string;
		assignedBy?: string;
		assignedAt?: string;
		$createdAt?: string;
		userId?: string;
	}> = [];

	for (const row of roleRows.rows) {
		const userId = String((row as { userId?: string }).userId || "");
		const assignedBy = String((row as { assignedBy?: string }).assignedBy || "");
		const roleId = String((row as { roleId?: string }).roleId || "");
		if (targetCandidateIds.has(userId)) {
			targetRoleRows.push({
				$id: String((row as { $id?: string }).$id || ""),
				roleId,
				assignedBy,
				assignedAt: (row as { assignedAt?: string }).assignedAt,
				$createdAt: (row as { $createdAt?: string }).$createdAt,
				userId,
			});
		}
		const childId = toProfileId(userId);
		const parentId = isSystemAssigner(assignedBy)
			? null
			: toProfileId(assignedBy);
		if (childId && parentId) {
			parentOf.set(childId, parentId);
		}
	}

	if (assignmentWouldCycle(targetId, assignerId, parentOf)) {
		throw new ReassignAssignerError(
			"That connection would create a circular assignment chain",
		);
	}

	const primary = pickPrimaryRoleRow(targetRoleRows, rolesById);
	if (!primary?.$id) {
		throw new ReassignAssignerError(
			"This user has no role assignment to reconnect",
		);
	}

	const org = await getOrganization(orgId);
	const managerSource = org?.settings?.managerUserId_source;
	const { patch, skippedManager } = buildReassignUserPatch({
		assignerIsSystem,
		assignerUserId: assignerId,
		assignerDepartment,
		assignerDivision,
		managerSource,
	});

	const previousAssignedBy = primary.assignedBy || "system";
	const nextAssignedBy = assignerIsSystem ? "system" : assignerId;

	await tablesDB.updateRow({
		databaseId: db(),
		tableId: "user_roles",
		rowId: primary.$id,
		data: { assignedBy: nextAssignedBy },
	});

	try {
		if (Object.keys(patch).length > 0) {
			await tablesDB.updateRow({
				databaseId: db(),
				tableId: usersTable(),
				rowId: targetId,
				data: {
					...patch,
					...(target.orgId ? { orgId: target.orgId } : {}),
				},
			});
		}
	} catch (error) {
		await tablesDB
			.updateRow({
				databaseId: db(),
				tableId: "user_roles",
				rowId: primary.$id,
				data: { assignedBy: previousAssignedBy },
			})
			.catch(() => undefined);
		throw error;
	}

	if (skippedManager) {
		const sourceLabel = managerSource || "unset";
		console.info(
			`[SERVER] reassignAssigner: managerUserId not updated — source is ${sourceLabel === "scim" ? "SCIM" : sourceLabel}`,
		);
	}

	await CacheManager.invalidateUsers(
		String(target.email || "") || undefined,
		targetId,
		targetAccountId || undefined,
		String(target.fullName || "") || undefined,
	);

	return {
		assignedById: nextAssignedBy,
		managerUpdated: !skippedManager,
	};
}
