import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { closeTicket } from "@/lib/tickets/ticket-close.service";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ ticketId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.TICKETS.RESOLVE, PERMISSIONS.PLATFORM.ELEVATE],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	const { ticketId } = await params;

	let note: string | undefined;
	try {
		const body = (await request.json()) as { note?: unknown };
		if (typeof body.note === "string") note = body.note;
	} catch {
		// empty body ok
	}

	try {
		const ticket = await closeTicket({
			ticketId,
			actorId: user.$id,
			permissions,
			note,
		});
		return NextResponse.json({ ticket });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Close failed";
		const status = message.includes("Not allowed") ? 403 : 400;
		return NextResponse.json({ error: message }, { status });
	}
}
