import { type NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import {
	validateRoleAssignmentForSod,
	validateRoleIdsUnionForSod,
} from "@/lib/rbac/separation-of-duties";
import { logAuditEvent } from "@/lib/services/audit-logger";
import CacheManager from "@/lib/services/cache-manager";

async function listUserRoleRows(
	tablesDB: Awaited<ReturnType<typeof createAdminClient>>["tablesDB"],
	userId: string,
	orgId: string,
) {
	return tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "user_roles",
		queries: [
			Query.equal("userId", userId),
			Query.equal("orgId", orgId),
			Query.limit(100),
		],
	});
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.VIEW,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const { userId } = await params;
		const orgId = await getOrgIdFromRequest(request);
		if (!orgId) {
			return NextResponse.json(
				{ success: false, error: "Organization context required" },
				{ status: 400 },
			);
		}

		const { tablesDB } = await createAdminClient();
		const userRoles = await listUserRoleRows(tablesDB, userId, orgId);

		const roleIds = userRoles.rows.map(
			(ur) => (ur as unknown as { roleId: string }).roleId,
		);
		const roles = await Promise.all(
			roleIds.map(async (roleId: string) => {
				try {
					return await tablesDB.getRow({
						databaseId: appwriteConfig.databaseId || "default-db",
						tableId: "roles",
						rowId: roleId,
					});
				} catch {
					return null;
				}
			}),
		);

		return NextResponse.json({
			success: true,
			data: {
				assignments: userRoles.rows,
				roles: roles.filter(Boolean),
			},
		});
	} catch (error) {
		console.error("Error fetching user roles:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch user roles" },
			{ status: 500 },
		);
	}
}

/**
 * Assign roles to a user.
 *
 * Body shapes:
 * - { roleId, action?: "replace"|"add"|"remove", orgId? }  (legacy single-role)
 * - { roleIds: string[], mode?: "replace"|"add"|"remove", orgId? } (multi-role)
 *
 * Default mode is "replace" for backward compatibility with the single-role UI.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.ASSIGN_ROLES,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const { userId } = await params;
		const body = await request.json();
		const {
			roleId,
			roleIds,
			orgId,
			action,
			mode,
		}: {
			roleId?: string;
			roleIds?: string[];
			orgId?: string;
			action?: "replace" | "add" | "remove";
			mode?: "replace" | "add" | "remove";
		} = body;

		const op = mode || action || "replace";
		const targetOrgId = orgId || (await getOrgIdFromRequest(request));
		if (!targetOrgId) {
			return NextResponse.json(
				{ success: false, error: "Organization context required" },
				{ status: 400 },
			);
		}

		const incomingIds: string[] = Array.isArray(roleIds)
			? roleIds.filter(Boolean)
			: roleId
				? [roleId]
				: [];

		if (incomingIds.length === 0 && op !== "remove") {
			return NextResponse.json(
				{ success: false, error: "roleId or roleIds is required" },
				{ status: 400 },
			);
		}

		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		const { tablesDB } = await createAdminClient();
		const existing = await listUserRoleRows(tablesDB, userId, targetOrgId);
		const existingRoleIds = existing.rows.map(
			(ur) => (ur as unknown as { roleId: string }).roleId,
		);

		let nextRoleIds: string[] = existingRoleIds;
		if (op === "replace") {
			nextRoleIds = incomingIds;
		} else if (op === "add") {
			nextRoleIds = [...new Set([...existingRoleIds, ...incomingIds])];
		} else if (op === "remove") {
			const removeSet = new Set(incomingIds);
			nextRoleIds = existingRoleIds.filter((id) => !removeSet.has(id));
		}

		const sod =
			nextRoleIds.length === 1
				? await validateRoleAssignmentForSod(nextRoleIds[0])
				: await validateRoleIdsUnionForSod(nextRoleIds);
		if (!sod.ok) {
			return NextResponse.json(
				{ success: false, error: sod.message },
				{ status: 400 },
			);
		}

		for (const ur of existing.rows) {
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_roles",
				rowId: ur.$id,
			});
		}

		const assignments = [];
		for (const nextRoleId of nextRoleIds) {
			const assignment = await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_roles",
				rowId: ID.unique(),
				data: {
					userId,
					roleId: nextRoleId,
					orgId: targetOrgId,
					assignedBy: currentUser.$id,
					assignedAt: new Date().toISOString(),
				},
			});
			assignments.push(assignment);
		}

		await CacheManager.invalidateRBAC(userId, targetOrgId);

		await logAuditEvent({
			event_id: "rbac_user_role_assigned",
			event_title: "User role assignment updated",
			action: "update",
			source: "caalm",
			user_id: currentUser.$id,
			user_name:
				(currentUser as { fullName?: string }).fullName ||
				currentUser.email ||
				"unknown",
			user_email: currentUser.email || "",
			orgId: targetOrgId,
			status: "success",
			module: "governance",
			target_type: "user_role",
			target_id: userId,
			target_label: userId,
			summary: `${(currentUser as { fullName?: string }).fullName || currentUser.email} updated roles for user ${userId} (${op})`,
			metadata: {
				targetUserId: userId,
				roleIds: nextRoleIds,
				mode: op,
			},
		});

		return NextResponse.json({
			success: true,
			data: {
				assignments,
				roleIds: nextRoleIds,
				mode: op,
			},
		});
	} catch (error) {
		console.error("Error assigning role to user:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to assign role" },
			{ status: 500 },
		);
	}
}
