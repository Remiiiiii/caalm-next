import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createInvitation, getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.INVITE,
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

		const body = await request.json();
		const { email, name, role, department, division, orgId } = body;

		if (!email || !name || !role || !department || !orgId) {
			return NextResponse.json(
				{
					error:
						"Missing required fields: email, name, role, department, orgId",
				},
				{ status: 400 },
			);
		}

		const hasOrgAccess = await validateUserOrgAccess(currentUser.$id, orgId);
		if (!hasOrgAccess) {
			return NextResponse.json(
				{ error: "Access denied to this organization" },
				{ status: 403 },
			);
		}

		const invitation = await createInvitation({
			email,
			name,
			role,
			department,
			division,
			orgId,
			invitedBy: currentUser.$id,
		});

		return NextResponse.json({ data: invitation });
	} catch (error) {
		console.error("Failed to create invitation:", error);

		return NextResponse.json(
			{
				error: "Failed to create invitation",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
