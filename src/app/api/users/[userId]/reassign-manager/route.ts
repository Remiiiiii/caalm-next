import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	ReassignManagerError,
	reassignManager,
} from "@/lib/users/reassign-manager";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.USERS.EDIT,
	});
	if (denied) return denied;

	try {
		const { userId } = await params;
		const body = (await request.json().catch(() => ({}))) as {
			managerUserId?: string | null;
		};
		if (!("managerUserId" in body)) {
			return NextResponse.json(
				{ success: false, error: "managerUserId is required" },
				{ status: 400 },
			);
		}

		const result = await reassignManager({
			targetUserId: userId,
			managerUserId: body.managerUserId ?? null,
		});

		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		if (error instanceof ReassignManagerError) {
			return NextResponse.json(
				{ success: false, error: error.message },
				{ status: error.status },
			);
		}
		console.error("[SERVER] reassignManager:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update manager" },
			{ status: 500 },
		);
	}
}
