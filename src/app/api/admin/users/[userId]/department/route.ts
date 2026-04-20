import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { updateUserDepartment } from "@/lib/actions/user.actions";
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
		// Check permission to update users
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.UPDATE,
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
	} catch (error: any) {
		console.error("Error updating user department:", error);
		return NextResponse.json(
			{
				error: error.message || "Failed to update user department",
				details:
					process.env.NODE_ENV === "development" ? error.stack : undefined,
			},
			{ status: 500 },
		);
	}
}

export async function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
