import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { updateUserProfile } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(req: NextRequest) {
	try {
		const permissionCheck = await requirePermission(req, {
			permission: PERMISSIONS.USERS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const body = await req.json();
		const { accountId, fullName, role, division, department, status } = body;
		if (!accountId) {
			return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
		}

		const allowedDivisions = [
			"behavioral-health",
			"child-welfare",
			"clinic",
			"c-suite",
			"cfs",
			"hr",
			"residential",
			"support",
			"help-desk",
			"accounting",
		];
		let divisionValue;
		if (division !== undefined) {
			if (!allowedDivisions.includes(division)) {
				return NextResponse.json(
					{ error: "Invalid division value" },
					{ status: 400 },
				);
			}
			divisionValue = division;
		}

		if (
			status !== undefined &&
			!["active", "inactive", "suspended"].includes(status)
		) {
			return NextResponse.json({ error: "Invalid status" }, { status: 400 });
		}

		const updatedUser = await updateUserProfile({
			accountId,
			fullName,
			role,
			division: divisionValue,
			department,
			status,
		});
		return NextResponse.json({ user: updatedUser });
	} catch (error) {
		return NextResponse.json(
			{ error: (error as Error).message || "Failed to update user profile" },
			{ status: 500 },
		);
	}
}

export function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
