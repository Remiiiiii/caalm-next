import { type NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { listRoles } from "@/lib/rbac/roles";

export async function POST(request: NextRequest) {
	try {
		// Check permission to assign roles
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.ASSIGN_ROLES,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const { email, roleName, orgId } = await request.json();

		if (!email || !roleName) {
			return NextResponse.json(
				{ error: "Email and roleName are required" },
				{ status: 400 },
			);
		}

		// Get organization context
		const targetOrgId =
			orgId || (await getUserDefaultOrganization(currentUser.$id))?.orgId;
		if (!targetOrgId) {
			return NextResponse.json(
				{ error: "Organization context required" },
				{ status: 400 },
			);
		}

		const { tablesDB } = await createAdminClient();

		// Find user by email
		const users = await tablesDB.listRows(
			appwriteConfig.databaseId,
			appwriteConfig.usersCollectionId,
			[Query.equal("email", email)],
		);

		if (users.total === 0) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const user = users.rows[0];

		// Find role by name
		const roles = await listRoles(targetOrgId);
		const role = roles.find((r) => r.name === roleName);

		if (!role) {
			return NextResponse.json(
				{ error: `Role "${roleName}" not found` },
				{ status: 404 },
			);
		}

		// Remove existing role assignments for this user in this org
		const existingRoles = await tablesDB.listRows(
			appwriteConfig.databaseId,
			"user_roles",
			[Query.equal("userId", user.$id), Query.equal("orgId", targetOrgId)],
		);

		for (const ur of existingRoles.rows) {
			await tablesDB.deleteRow(appwriteConfig.databaseId, "user_roles", ur.$id);
		}

		// Assign new role
		await tablesDB.createRow(
			appwriteConfig.databaseId,
			"user_roles",
			ID.unique(),
			{
				userId: user.$id,
				roleId: role.$id,
				orgId: targetOrgId,
				assignedBy: currentUser.$id,
			},
		);

		// Also update legacy role field for backward compatibility
		await tablesDB.updateRow(
			appwriteConfig.databaseId,
			appwriteConfig.usersCollectionId,
			user.$id,
			{
				role: roleName.toLowerCase().replace(/\s+/g, "-"),
			},
		);

		return NextResponse.json(
			{
				success: true,
				message: `User role updated to ${roleName}`,
				user: {
					email: user.email,
					role: roleName,
					fullName: user.fullName,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error updating user role:", error);
		return NextResponse.json(
			{ error: "Failed to update user role" },
			{ status: 500 },
		);
	}
}
