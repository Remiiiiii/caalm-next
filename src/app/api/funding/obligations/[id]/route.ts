import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteObligation,
	getObligationById,
	isObligationKind,
	isObligationStatus,
	updateObligation,
} from "@/lib/funding";
import { requireFundingOrgContext } from "@/lib/funding/request-context";
import { parseAllowedHttpUrl } from "@/lib/funding/safe-link-url";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await getObligationById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Obligation not found" },
			{ status: 404 },
		);
	}

	try {
		const body = await request.json();
		const patch: Record<string, unknown> = {};
		if (body.title != null) patch.title = String(body.title).slice(0, 256);
		if (body.description != null) patch.description = String(body.description);
		if (isObligationKind(body.kind)) patch.kind = body.kind;
		if (isObligationStatus(body.status)) patch.status = body.status;
		if (body.dueDate != null) patch.dueDate = String(body.dueDate);
		if (body.ownerUserId != null) patch.ownerUserId = String(body.ownerUserId);
		if (body.ownerName != null) patch.ownerName = String(body.ownerName);
		if (body.renewalLinked != null)
			patch.renewalLinked = Boolean(body.renewalLinked);
		if (body.linkUrl != null) {
			const raw = String(body.linkUrl).trim();
			if (!raw) {
				patch.linkUrl = "";
			} else {
				const parsed = parseAllowedHttpUrl(raw);
				if (!parsed) {
					return NextResponse.json(
						{ error: "Invalid link URL; use http or https" },
						{ status: 400 },
					);
				}
				patch.linkUrl = parsed.slice(0, 2048);
			}
		}
		if (body.reminderDaysBefore != null) {
			const days = Number(body.reminderDaysBefore);
			if (Number.isFinite(days)) patch.reminderDaysBefore = days;
		}

		const obligation = await updateObligation(id, patch);
		return NextResponse.json({ obligation });
	} catch (error) {
		console.error("[funding/obligations PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update obligation" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await getObligationById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Obligation not found" },
			{ status: 404 },
		);
	}

	try {
		await deleteObligation(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[funding/obligations DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to delete obligation" },
			{ status: 500 },
		);
	}
}
