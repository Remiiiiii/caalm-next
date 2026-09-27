import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { listTickets } from "@/lib/tickets/ticket.repository";
import {
	canViewAllTickets,
	filterVisibleTickets,
} from "@/lib/tickets/ticket-access.policy";
import {
	buildCreateTicketInput,
	intakeTicket,
	uploadTicketAttachments,
} from "@/lib/tickets/ticket-intake.service";
import { normalizeTicketNumberQuery } from "@/lib/tickets/ticket-number.utils";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.TICKETS.VIEW,
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
	if (!org?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const permissions = await getUserPermissions(user.$id, org.orgId);
	const { searchParams } = new URL(request.url);
	const statusParam = searchParams.get("status") as
		| "active"
		| "resolved"
		| null;
	const rawSearch = searchParams.get("q") || searchParams.get("search") || "";
	const normalizedNumber = normalizeTicketNumberQuery(rawSearch);
	const search =
		normalizedNumber.startsWith("TKT-") && /\d/.test(normalizedNumber)
			? normalizedNumber
			: rawSearch.trim();

	const { items, total } = await listTickets({
		orgId: org.orgId,
		status: statusParam || undefined,
		submittedByUserId: canViewAllTickets(permissions) ? undefined : user.$id,
		search: search || undefined,
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
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	try {
		const contentType = request.headers.get("content-type") || "";
		let title = "";
		let description = "";
		let lane: unknown = "";
		let category: unknown = "";
		let affectedModule: unknown = "";
		let impact: unknown = "";
		let urgency: unknown = "";
		let steps: unknown = "";
		let expected: unknown = "";
		let actual: unknown = "";
		let os: unknown = "";
		let environment: unknown = "";
		let searchedExisting: unknown = "";
		let isBug: unknown = "";
		let files: File[] = [];

		if (contentType.includes("multipart/form-data")) {
			const form = await request.formData();
			title = String(form.get("title") || "");
			description = String(form.get("description") || "");
			lane = form.get("lane") || "";
			category = form.get("category") || "";
			affectedModule = form.get("affectedModule") || "";
			impact = form.get("impact") || "";
			urgency = form.get("urgency") || "";
			steps = form.get("steps") || "";
			expected = form.get("expected") || "";
			actual = form.get("actual") || "";
			os = form.get("os") || "";
			environment = form.get("environment") || "";
			searchedExisting = form.get("searchedExisting") || "";
			isBug = form.get("isBug") || "";
			files = form
				.getAll("attachments")
				.filter((item): item is File => item instanceof File);
		} else {
			const body = await request.json();
			title = String(body.title || "");
			description = String(body.description || "");
			lane = body.lane;
			category = body.category;
			affectedModule = body.affectedModule;
			impact = body.impact;
			urgency = body.urgency;
			steps = body.steps;
			expected = body.expected;
			actual = body.actual;
			os = body.os;
			environment = body.environment;
			searchedExisting = body.searchedExisting;
			isBug = body.isBug;
		}

		const isEngineering = String(lane || "").trim() === "engineering";
		if (
			title.trim().length < 3 ||
			(!isEngineering && description.trim().length < 8)
		) {
			return NextResponse.json(
				{
					error: isEngineering
						? "Title is required"
						: "Title and description are required",
				},
				{ status: 400 },
			);
		}

		const attachmentIds = await uploadTicketAttachments(files);
		const payload = buildCreateTicketInput({
			title,
			description,
			lane,
			category,
			affectedModule,
			impact,
			urgency,
			attachmentIds,
			steps,
			expected,
			actual,
			os,
			environment,
			searchedExisting,
			isBug,
		});
		const ticket = await intakeTicket({
			payload,
			actor: {
				$id: user.$id,
				fullName: user.fullName,
				division: user.division,
				department: user.department,
				departmentLabel: user.departmentLabel,
				divisionLabel: user.divisionLabel,
			},
			orgId: org.orgId,
		});

		return NextResponse.json({ ticket }, { status: 201 });
	} catch (error) {
		console.error("[api/tickets] POST", error);
		const message =
			error instanceof Error ? error.message : "Failed to create ticket";
		const status =
			message.startsWith("Invalid ") || message.includes("combination")
				? 400
				: 500;
		return NextResponse.json({ error: message }, { status });
	}
}
