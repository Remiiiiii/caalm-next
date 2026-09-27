import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	DiagramPositionError,
	updateDiagramPosition,
} from "@/lib/users/diagram-position";

export async function PATCH(
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
			x?: unknown;
			y?: unknown;
		};
		const x = typeof body.x === "number" ? body.x : Number(body.x);
		const y = typeof body.y === "number" ? body.y : Number(body.y);

		const result = await updateDiagramPosition({ userId, x, y });
		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		if (error instanceof DiagramPositionError) {
			return NextResponse.json(
				{ success: false, error: error.message },
				{ status: error.status },
			);
		}
		console.error("[SERVER] updateDiagramPosition:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to save diagram position" },
			{ status: 500 },
		);
	}
}
