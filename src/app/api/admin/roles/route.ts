import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import {
	assignPermissionsToRole,
	createRole,
	deleteRole,
	getRoleMemberCountsForOrg,
	listRoles,
} from "@/lib/rbac/roles";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.ASSIGN_ROLES,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const orgId = await getOrgIdFromRequest(request);
		const roles = await listRoles(orgId);
		const memberCounts =
			orgId && String(orgId).trim()
				? await getRoleMemberCountsForOrg(String(orgId))
				: {};

		const data = roles.map((role) => ({
			...role,
			memberCount: memberCounts[role.$id] ?? 0,
		}));

		return NextResponse.json({
			success: true,
			data,
		});
	} catch (error) {
		console.error("Error fetching roles:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch roles" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.ASSIGN_ROLES,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const body = await request.json();
		const {
			name,
			description,
			orgId: orgIdBody,
			permissionKeys,
		} = body as {
			name?: string;
			description?: string;
			orgId?: string | null;
			permissionKeys?: string[];
		};

		if (!name?.trim()) {
			return NextResponse.json(
				{ success: false, error: "Role name is required" },
				{ status: 400 },
			);
		}

		const { getCurrentUser } = await import("@/lib/actions/user.actions");
		const currentUser = await getCurrentUser();

		if (!currentUser) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		const fromRequest = getOrgIdFromRequest(request);
		const fromBody =
			orgIdBody != null && String(orgIdBody).trim()
				? String(orgIdBody).trim()
				: undefined;
		const resolvedOrgId = fromRequest?.trim() || fromBody || null;

		const keys = (permissionKeys ?? []) as PermissionKey[];
		const { validatePermissionsForSod } = await import(
			"@/lib/rbac/separation-of-duties"
		);
		const sod = validatePermissionsForSod(keys, { isSystemRole: false });
		if (!sod.ok) {
			return NextResponse.json(
				{ success: false, error: sod.message },
				{ status: 400 },
			);
		}

		const role = await createRole({
			name: name.trim(),
			description: description || "",
			orgId: resolvedOrgId,
			isSystemRole: false,
			createdBy: currentUser.$id,
		});

		const assigned = await assignPermissionsToRole(role.$id, keys);

		if (!assigned) {
			try {
				await deleteRole(role.$id);
			} catch (cleanupError) {
				console.error(
					"[POST /api/admin/roles] Failed to roll back role after permission error:",
					cleanupError,
				);
			}
			return NextResponse.json(
				{ success: false, error: "Failed to assign permissions to role" },
				{ status: 500 },
			);
		}

		const CacheManager = (await import("@/lib/services/cache-manager")).default;
		await CacheManager.invalidateRBAC();

		return NextResponse.json({
			success: true,
			data: role,
			sodWarnings: sod.warnings ?? [],
		});
	} catch (error) {
		console.error("Error creating role:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to create role" },
			{ status: 500 },
		);
	}
}
