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
		let problemPageUrl: unknown = "";
		let files: File[] = [];
		const appOrigin = new URL(request.url).origin;

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
			problemPageUrl = form.get("problemPageUrl") || "";
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
			problemPageUrl = body.problemPageUrl;
		}

		const isEngineering = String(lane || "").trim() === "engineering";
		const titleTrimmed = title.trim();
		const descriptionTrimmed = description.trim();

		if (titleTrimmed.length < 3) {
			return NextResponse.json(
				{ error: "Title must be at least 3 characters" },
				{ status: 400 },
			);
		}

		// Additional validation for title content quality
		if (/^[^a-zA-Z0-9\s]{3,}$/.test(titleTrimmed)) {
			return NextResponse.json(
				{ error: "Title must contain meaningful text" },
				{ status: 400 },
			);
		}

		if (isEngineering) {
			// Engineering tickets require structured bug report fields
			const stepsTrimmed = String(steps || "").trim();
			const expectedTrimmed = String(expected || "").trim();
			const actualTrimmed = String(actual || "").trim();
			const osTrimmed = String(os || "").trim();
			const environmentTrimmed = String(environment || "").trim();

			if (stepsTrimmed.length < 8) {
				return NextResponse.json(
					{ error: "Reproduction steps must be at least 8 characters" },
					{ status: 400 },
				);
			}
			if (expectedTrimmed.length < 8) {
				return NextResponse.json(
					{ error: "Expected behavior must be at least 8 characters" },
					{ status: 400 },
				);
			}
			if (actualTrimmed.length < 8) {
				return NextResponse.json(
					{ error: "Actual behavior must be at least 8 characters" },
					{ status: 400 },
				);
			}
			if (!osTrimmed) {
				return NextResponse.json(
					{ error: "Operating system is required" },
					{ status: 400 },
				);
			}
			if (!environmentTrimmed) {
				return NextResponse.json(
					{ error: "Environment is required" },
					{ status: 400 },
				);
			}

			// Check for meaningless gibberish in key fields
			const gibberishPattern = /^([a-z])\1{2,}$|^[a-z]{1,2}([a-z]{1,2})\1{2,}$/i;
			if (
				gibberishPattern.test(stepsTrimmed) ||
				gibberishPattern.test(expectedTrimmed) ||
				gibberishPattern.test(actualTrimmed)
			) {
				return NextResponse.json(
					{ error: "Please provide meaningful descriptions, not random text" },
					{ status: 400 },
				);
			}
		} else {
			// Help tickets require description
			if (descriptionTrimmed.length < 8) {
				return NextResponse.json(
					{ error: "Description must be at least 8 characters" },
					{ status: 400 },
				);
			}

			// Check for meaningless gibberish
			const gibberishPattern = /^([a-z])\1{2,}$|^[a-z]{1,2}([a-z]{1,2})\1{2,}$/i;
			if (gibberishPattern.test(descriptionTrimmed)) {
				return NextResponse.json(
					{ error: "Please provide a meaningful description, not random text" },
					{ status: 400 },
				);
			}
		}

		const attachmentIds = await uploadTicketAttachments(files);
		const payload = buildCreateTicketInput({
			title,
			description,
			lane,
			category,
			affectedModule,
			problemPageUrl,
			appOrigin,
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
