import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	ReassignAssignerError,
	reassignAssigner,
} from "@/lib/users/reassign-assigner";

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
			assignerUserId?: string;
		};
		const assignerUserId = String(body.assignerUserId || "").trim();
		if (!assignerUserId) {
			return NextResponse.json(
				{ success: false, error: "assignerUserId is required" },
				{ status: 400 },
			);
		}

		const result = await reassignAssigner({
			targetUserId: userId,
			assignerUserId,
		});

		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		if (error instanceof ReassignAssignerError) {
			return NextResponse.json(
				{ success: false, error: error.message },
				{ status: error.status },
			);
		}
		console.error("[SERVER] reassignAssigner:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update assignment" },
			{ status: 500 },
		);
	}
}
