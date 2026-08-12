import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { updateUserDepartment } from "@/lib/actions/user.actions";
import { OrgUnitValidationError } from "@/lib/org/org-unit-validation";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Update a user's department field
 * PATCH /api/admin/users/[userId]/department
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.EDIT,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const { userId } = await params;
		const { department } = await request.json();

		if (!department) {
			return NextResponse.json(
				{ error: "Department is required" },
				{ status: 400 },
			);
		}

		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		const updatedUser = await updateUserDepartment({
			userId,
			department,
		});

		if (!updatedUser) {
			return NextResponse.json(
				{ error: "Failed to update user department" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: "User department updated successfully",
			user: updatedUser,
		});
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to update user department";
		const status = error instanceof OrgUnitValidationError ? 400 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

export async function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
