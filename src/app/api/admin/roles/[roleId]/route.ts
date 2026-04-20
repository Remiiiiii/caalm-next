import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	deleteRole,
	getRole,
	getRolePermissions,
	updateRole,
} from "@/lib/rbac/roles";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.ASSIGN_ROLES,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const { roleId } = await params;
		const role = await getRole(roleId);
		if (!role) {
			return NextResponse.json(
				{ success: false, error: "Role not found" },
				{ status: 404 },
			);
		}

		const permissions = await getRolePermissions(roleId);

		return NextResponse.json({
			success: true,
			data: {
				role,
				permissions,
			},
		});
	} catch (error) {
		console.error("Error fetching role:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch role" },
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.ASSIGN_ROLES,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const { roleId } = await params;
		const { name, description, permissionKeys } = await request.json();

		const role = await updateRole(
			roleId,
			name,
			description || "",
			permissionKeys || [],
		);

		return NextResponse.json({
			success: true,
			data: role,
		});
	} catch (error) {
		console.error("Error updating role:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update role" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ roleId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.ASSIGN_ROLES,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const { roleId } = await params;
		await deleteRole(roleId);

		return NextResponse.json({
			success: true,
			message: "Role deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting role:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to delete role",
			},
			{ status: 500 },
		);
	}
}
