import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deletePursuit,
	getPursuitById,
	isPursuitStage,
	updatePursuit,
} from "@/lib/funding";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await getPursuitById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json({ error: "Pursuit not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const patch: Record<string, unknown> = {};
		if (body.title != null) patch.title = String(body.title).slice(0, 256);
		if (body.description != null) patch.description = String(body.description);
		if (body.amount != null) {
			const amount = Number(body.amount);
			if (!Number.isFinite(amount) || amount < 0) {
				return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
			}
			patch.amount = amount;
		}
		if (isPursuitStage(body.stage)) patch.stage = body.stage;
		if (body.notes != null) patch.notes = String(body.notes);
		if (body.ownerUserId != null) patch.ownerUserId = String(body.ownerUserId);
		if (body.ownerName != null) patch.ownerName = String(body.ownerName);
		if (body.department != null) patch.department = String(body.department);
		if (body.responseDeadline != null) {
			patch.responseDeadline = String(body.responseDeadline);
		}

		const pursuit = await updatePursuit(id, patch);
		return NextResponse.json({ pursuit });
	} catch (error) {
		console.error("[funding/pursuits PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update pursuit" },
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
	const existing = await getPursuitById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json({ error: "Pursuit not found" }, { status: 404 });
	}

	try {
		await deletePursuit(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[funding/pursuits DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to delete pursuit" },
			{ status: 500 },
		);
	}
}
