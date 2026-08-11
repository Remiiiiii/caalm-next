import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { updateUserProfile } from "@/lib/actions/user.actions";
import {
	normalizeOrgPlacement,
	OrgUnitValidationError,
} from "@/lib/org/org-unit-validation";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(req: NextRequest) {
	try {
		const permissionCheck = await requirePermission(req, {
			permission: PERMISSIONS.USERS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const body = await req.json();
		const {
			accountId,
			fullName,
			role,
			division,
			department,
			status,
			managerUserId,
			costCenterId,
			primaryOrgUnitId,
			departmentId,
			divisionId,
		} = body;
		if (!accountId) {
			return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
		}

		if (
			status !== undefined &&
			!["active", "inactive", "suspended"].includes(status)
		) {
			return NextResponse.json({ error: "Invalid status" }, { status: 400 });
		}

		if (division !== undefined || department !== undefined) {
			try {
				normalizeOrgPlacement({
					department,
					division,
					requireDepartment: department !== undefined || division !== undefined,
				});
			} catch (err) {
				if (err instanceof OrgUnitValidationError) {
					return NextResponse.json({ error: err.message }, { status: 400 });
				}
				throw err;
			}
		}

		const updatedUser = await updateUserProfile({
			accountId,
			fullName,
			role,
			division,
			department,
			status,
			managerUserId,
			costCenterId,
			primaryOrgUnitId,
			departmentId,
			divisionId,
		});
		return NextResponse.json({ user: updatedUser });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update user profile";
		const status = error instanceof OrgUnitValidationError ? 400 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

export function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
