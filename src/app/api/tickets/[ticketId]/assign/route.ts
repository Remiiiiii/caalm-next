import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { assignTicket } from "@/lib/tickets/ticket-assign.service";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ ticketId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.TICKETS.ASSIGN, PERMISSIONS.PLATFORM.ELEVATE],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const body = (await request.json().catch(() => null)) as {
		assigneeId?: unknown;
	} | null;
	const assigneeId =
		typeof body?.assigneeId === "string" ? body.assigneeId.trim() : "";
	if (!assigneeId) {
		return NextResponse.json(
			{ error: "assigneeId is required" },
			{ status: 400 },
		);
	}

	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	const { ticketId } = await params;

	try {
		const ticket = await assignTicket({
			ticketId,
			assigneeId,
			actorId: user.$id,
			permissions,
		});
		return NextResponse.json({ ticket });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Assign failed";
		const status = message.includes("Not allowed") ? 403 : 400;
		return NextResponse.json({ error: message }, { status });
	}
}
