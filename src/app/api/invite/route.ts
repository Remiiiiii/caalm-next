import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createInvitation, getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";

export async function POST(req: NextRequest) {
	try {
		const permissionCheck = await requirePermission(req, {
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

		const body = await req.json();
		const { name, email, role, orgId, department, division } = body;
		if (!name || !email || !role || !orgId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
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

		const result = await createInvitation({
			name,
			email,
			role,
			orgId,
			invitedBy: currentUser.$id,
			department: department ?? "",
			division,
		});
		return NextResponse.json(result, { status: 200 });
	} catch (err: unknown) {
		let message = "Internal Server Error";
		if (err instanceof Error) message = err.message;
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
