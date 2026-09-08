import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { revokeInvitation } from "@/lib/actions/user.actions";
import { requireStepUpForSession } from "@/lib/auth/step-up";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ token: string }> },
) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.INVITE,
		});
		if (permissionCheck) return permissionCheck;

		const stepUpCheck = await requireStepUpForSession(request);
		if (stepUpCheck) return stepUpCheck;

		const resolvedParams = await params;
		const { token } = resolvedParams;

		if (!token) {
			return NextResponse.json({ error: "Token is required" }, { status: 400 });
		}

		await revokeInvitation({ token });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to revoke invitation:", error);
		return NextResponse.json(
			{ error: "Failed to revoke invitation" },
			{ status: 500 },
		);
	}
}
