import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { messageFixAgent } from "@/lib/tickets/ticket-fix-agent.service";

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
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const org = await getUserDefaultOrganization(user.$id);
	const permissions = await getUserPermissions(user.$id, org?.orgId);
	const { ticketId } = await params;

	let text = "";
	try {
		const body = (await request.json()) as { text?: unknown };
		if (typeof body.text === "string") text = body.text;
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 },
		);
	}

	try {
		await messageFixAgent({
			ticketId,
			actorId: user.$id,
			permissions,
			text,
		});
		return NextResponse.json({ ok: true }, { status: 202 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not message the agent";
		const status = message.includes("Not allowed")
			? 403
			: message === "Ticket not found"
				? 404
				: 400;
		return NextResponse.json({ error: message }, { status });
	}
}
