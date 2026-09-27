import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById } from "@/lib/constituents";
import {
	createVolunteerAcknowledgmentEnvelope,
	listWaiversForConstituent,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const constituent = await getConstituentById(id);
	if (!constituent || constituent.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	const items = await listWaiversForConstituent(ctx.orgId, id);
	return NextResponse.json({ items });
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const constituent = await getConstituentById(id);
	if (!constituent || constituent.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	try {
		const body = await request.json();
		const documentFileId = String(body.documentFileId || "").trim();
		const recipientEmail = String(
			body.recipientEmail || constituent.email || "",
		).trim();
		const recipientName = String(
			body.recipientName ||
				`${constituent.firstName} ${constituent.lastName}`.trim(),
		).trim();
		if (!documentFileId || !recipientEmail) {
			return NextResponse.json(
				{
					error:
						"documentFileId and recipientEmail are required for volunteer waiver / acknowledgment",
				},
				{ status: 400 },
			);
		}

		const result = await createVolunteerAcknowledgmentEnvelope({
			orgId: ctx.orgId,
			constituentId: id,
			documentFileId,
			createdBy: ctx.user.$id,
			recipientEmail,
			recipientName,
			title: "Volunteer waiver / acknowledgment",
		});

		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create waiver";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
