import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization, getUserPermissions } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";
import { canViewAllTickets, filterVisibleTickets } from "@/lib/tickets/ticket-access.policy";
import { intakeTicket, parseSeverity, uploadTicketAttachments } from "@/lib/tickets/ticket-intake.service";
import { listTickets } from "@/lib/tickets/ticket.repository";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.TICKETS.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const permissions = await getUserPermissions(user.$id, org.orgId);
	const { searchParams } = new URL(request.url);
	const statusParam = searchParams.get("status") as
		| "active"
		| "resolved"
		| null;

	const { items, total } = await listTickets({
		orgId: org.orgId,
		status: statusParam || undefined,
		submittedByUserId: canViewAllTickets(permissions) ? undefined : user.$id,
		limit: Number(searchParams.get("limit") || 50),
		offset: Number(searchParams.get("offset") || 0),
	});

	return NextResponse.json({
		items: filterVisibleTickets(items, { userId: user.$id, permissions }),
		total,
	});
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.TICKETS.CREATE,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	try {
		const contentType = request.headers.get("content-type") || "";
		let title = "";
		let description = "";
		let severityRaw: unknown = "medium";
		let files: File[] = [];

		if (contentType.includes("multipart/form-data")) {
			const form = await request.formData();
			title = String(form.get("title") || "");
			description = String(form.get("description") || "");
			severityRaw = form.get("severity") || "medium";
			files = form.getAll("attachments").filter((item): item is File => item instanceof File);
		} else {
			const body = await request.json();
			title = String(body.title || "");
			description = String(body.description || "");
			severityRaw = body.severity;
		}

		if (title.trim().length < 3 || description.trim().length < 8) {
			return NextResponse.json(
				{ error: "Title and description are required" },
				{ status: 400 },
			);
		}

		const attachmentIds = await uploadTicketAttachments(files);
		const ticket = await intakeTicket({
			payload: {
				title,
				description,
				severity: parseSeverity(severityRaw),
				attachmentIds,
			},
			actor: {
				$id: user.$id,
				fullName: user.fullName,
				division: user.division,
			},
			orgId: org.orgId,
		});

		return NextResponse.json({ ticket }, { status: 201 });
	} catch (error) {
		console.error("[api/tickets] POST", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to create ticket" },
			{ status: 500 },
		);
	}
}
