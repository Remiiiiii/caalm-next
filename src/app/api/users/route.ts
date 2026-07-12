import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listUsersForManagement } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.VIEW,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const orgId = getOrgIdFromRequest(request);
		if (!orgId) {
			return NextResponse.json(
				{ error: "Organization context required" },
				{ status: 400 },
			);
		}

		const users = await listUsersForManagement(orgId);
		return NextResponse.json(users);
	} catch (error) {
		console.error("Error fetching users:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 },
		);
	}
}
