/**
 * Active-user glance metrics for the executive dashboard.
 *
 * Counts unique people by **primary** role (same rule as User Management),
 * not raw `user_roles` rows. Raw rows over-count when:
 * - a Super Admin still has a leftover Department Manager assignment
 * - the same person has both profile-$id and accountId role rows
 */

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { flattenTableRow } from "@/lib/appwrite/flatten-row";
import { ROLE_DASHBOARD_FALLBACK } from "@/lib/rbac/role-dashboard-metadata";
import { listRoles } from "@/lib/rbac/roles";

export interface DashboardUserComposition {
	superAdmin: number;
	orgAdmin: number;
	deptManager: number;
	unassigned: number;
	inactive: number;
	addedThisMonth: number;
}

const EMPTY: DashboardUserComposition = {
	superAdmin: 0,
	orgAdmin: 0,
	deptManager: 0,
	unassigned: 0,
	inactive: 0,
	addedThisMonth: 0,
};

type RoleMeta = { name: string; priority: number };

export type CompositionUserRow = {
	$id: string;
	accountId?: string | null;
	status?: string | null;
	orgId?: string | null;
	$createdAt?: string | null;
};

export type CompositionAssignmentRow = {
	userId: string;
	roleId: string;
	assignedAt?: string | null;
	$createdAt?: string | null;
};

function startOfMonthIso(now = new Date()): string {
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	start.setHours(0, 0, 0, 0);
	return start.toISOString();
}

function roleDocId(role: { $id?: string; id?: string }): string {
	return String(role.$id || role.id || "").trim();
}

function roleDocName(role: {
	name?: string;
	data?: { name?: string };
}): string {
	return String(role.name || role.data?.name || "").trim();
}

function roleDocPriority(role: {
	$id?: string;
	id?: string;
	priority?: number;
	data?: { priority?: number };
}): number {
	const id = roleDocId(role);
	const fromDoc = role.priority ?? role.data?.priority;
	if (typeof fromDoc === "number") return fromDoc;
	return ROLE_DASHBOARD_FALLBACK[id]?.priority ?? 9999;
}

function resolveProfileId(
	rawUserId: string,
	profileIds: Set<string>,
	accountIdToProfileId: Map<string, string>,
): string | null {
	if (profileIds.has(rawUserId)) return rawUserId;
	return accountIdToProfileId.get(rawUserId) ?? null;
}

function isActiveStatus(status?: string | null): boolean {
	return status === "active";
}

function isInactiveStatus(status?: string | null): boolean {
	return status === "inactive";
}

function pickPrimaryRoleName(
	entries: Array<{ name: string; priority: number; assignedTs: number }>,
): string | null {
	if (entries.length === 0) return null;
	const sorted = [...entries].sort((a, b) => {
		if (a.priority !== b.priority) return a.priority - b.priority;
		return b.assignedTs - a.assignedTs;
	});
	return sorted[0]?.name || null;
}

/**
 * Pure composition math — shared by the API and unit tests.
 * Role buckets only include active users with that primary role.
 */
export function computeDashboardUserComposition(input: {
	users: CompositionUserRow[];
	assignments: CompositionAssignmentRow[];
	rolesById: Map<string, RoleMeta>;
	orgMemberProfileIds: Set<string>;
	orgId: string;
	now?: Date;
}): DashboardUserComposition {
	const { users, assignments, rolesById, orgMemberProfileIds, orgId } = input;
	const now = input.now ?? new Date();
	const monthStart = startOfMonthIso(now);

	const profileIds = new Set<string>();
	const accountIdToProfileId = new Map<string, string>();
	const usersById = new Map<string, CompositionUserRow>();

	for (const user of users) {
		const id = String(user.$id || "").trim();
		if (!id) continue;
		profileIds.add(id);
		usersById.set(id, user);
		const accountId = String(user.accountId || "").trim();
		if (accountId) accountIdToProfileId.set(accountId, id);
	}

	const roleEntriesByProfile = new Map<
		string,
		Array<{ name: string; priority: number; assignedTs: number }>
	>();

	for (const row of assignments) {
		const rawUserId = String(row.userId || "").trim();
		if (!rawUserId) continue;
		const profileId = resolveProfileId(
			rawUserId,
			profileIds,
			accountIdToProfileId,
		);
		if (!profileId) continue;

		const roleId = String(row.roleId || "").trim();
		const meta = roleId ? rolesById.get(roleId) : undefined;
		if (!meta?.name) continue;

		const assignedTs = Date.parse(
			String(row.assignedAt || row.$createdAt || ""),
		);
		const list = roleEntriesByProfile.get(profileId) ?? [];
		list.push({
			name: meta.name,
			priority: meta.priority,
			assignedTs: Number.isFinite(assignedTs) ? assignedTs : 0,
		});
		roleEntriesByProfile.set(profileId, list);
	}

	const inOrg = (user: CompositionUserRow): boolean => {
		const id = String(user.$id || "");
		if (user.orgId === orgId) return true;
		if (orgMemberProfileIds.has(id)) return true;
		if (roleEntriesByProfile.has(id)) return true;
		return false;
	};

	let superAdmin = 0;
	let orgAdmin = 0;
	let deptManager = 0;
	let unassigned = 0;
	let inactive = 0;
	let addedThisMonth = 0;

	for (const user of users) {
		if (!inOrg(user)) continue;
		const id = String(user.$id || "");
		const primary = pickPrimaryRoleName(roleEntriesByProfile.get(id) ?? []);

		if (isInactiveStatus(user.status)) {
			inactive += 1;
			continue;
		}

		if (!isActiveStatus(user.status)) {
			// Suspended / unknown status: skip role buckets (Active Users card)
			continue;
		}

		const createdAt = user.$createdAt || "";
		if (createdAt && createdAt >= monthStart) {
			addedThisMonth += 1;
		}

		if (!primary || primary === "Unassigned" || primary === "N/A") {
			unassigned += 1;
			continue;
		}

		if (primary === "Super Admin") superAdmin += 1;
		else if (primary === "Organization Admin") orgAdmin += 1;
		else if (primary === "Department Manager") deptManager += 1;
	}

	return {
		superAdmin,
		orgAdmin,
		deptManager,
		unassigned,
		inactive,
		addedThisMonth,
	};
}

export async function getDashboardUserComposition(
	orgId: string,
): Promise<DashboardUserComposition> {
	if (!orgId?.trim()) return { ...EMPTY };

	try {
		const { tablesDB } = await createAdminClient();
		const databaseId = appwriteConfig.databaseId || "default-db";
		const usersTableId = appwriteConfig.usersCollectionId || "users";

		const [roles, usersResult, userRolesResult, userOrgsResult] =
			await Promise.all([
				listRoles(orgId),
				tablesDB.listRows({
					databaseId,
					tableId: usersTableId,
					queries: [Query.limit(500)],
				}),
				tablesDB.listRows({
					databaseId,
					tableId: "user_roles",
					queries: [Query.equal("orgId", orgId), Query.limit(500)],
				}),
				tablesDB.listRows({
					databaseId,
					tableId: "user_organizations",
					queries: [Query.equal("orgId", orgId), Query.limit(500)],
				}),
			]);

		const rolesById = new Map<string, RoleMeta>();
		for (const role of roles) {
			const id = roleDocId(role);
			const name = roleDocName(role);
			if (!id || !name) continue;
			rolesById.set(id, {
				name,
				priority: roleDocPriority(role),
			});
		}

		const users: CompositionUserRow[] = (usersResult.rows || []).map((row) => {
			const flat = flattenTableRow(row as Record<string, unknown>);
			return {
				$id: String(flat.$id || ""),
				accountId: (flat.accountId as string | null | undefined) ?? null,
				status: (flat.status as string | null | undefined) ?? null,
				orgId: (flat.orgId as string | null | undefined) ?? null,
				$createdAt: (flat.$createdAt as string | null | undefined) ?? null,
			};
		});

		const profileIds = new Set(users.map((u) => u.$id).filter(Boolean));
		const accountIdToProfileId = new Map<string, string>();
		for (const user of users) {
			const accountId = String(user.accountId || "").trim();
			if (accountId) accountIdToProfileId.set(accountId, user.$id);
		}

		const orgMemberProfileIds = new Set<string>();
		for (const membership of userOrgsResult.rows || []) {
			const flat = flattenTableRow(membership as Record<string, unknown>);
			const rawUserId = String(flat.userId || "").trim();
			const profileId = resolveProfileId(
				rawUserId,
				profileIds,
				accountIdToProfileId,
			);
			if (profileId) orgMemberProfileIds.add(profileId);
		}

		const assignments: CompositionAssignmentRow[] = (
			userRolesResult.rows || []
		).map((row) => {
			const flat = flattenTableRow(row as Record<string, unknown>);
			return {
				userId: String(flat.userId || ""),
				roleId: String(flat.roleId || ""),
				assignedAt: (flat.assignedAt as string | null | undefined) ?? null,
				$createdAt: (flat.$createdAt as string | null | undefined) ?? null,
			};
		});

		return computeDashboardUserComposition({
			users,
			assignments,
			rolesById,
			orgMemberProfileIds,
			orgId,
		});
	} catch (error) {
		console.error("[getDashboardUserComposition]", error);
		return { ...EMPTY };
	}
}
