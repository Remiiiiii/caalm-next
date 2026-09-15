import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createPursuit,
	isPursuitSource,
	isPursuitStage,
	listPursuits,
} from "@/lib/funding";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

export async function GET(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const stageParam = request.nextUrl.searchParams.get("stage");
	const stage = isPursuitStage(stageParam) ? stageParam : undefined;

	try {
		const items = await listPursuits({ orgId: ctx.orgId, stage });
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[funding/pursuits GET]", error);
		return NextResponse.json(
			{ error: "Failed to list pursuits" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const body = await request.json();
		const title = String(body.title || "").trim();
		const amount = Number(body.amount);
		if (!title) {
			return NextResponse.json({ error: "title is required" }, { status: 400 });
		}
		if (!Number.isFinite(amount) || amount < 0) {
			return NextResponse.json(
				{ error: "amount must be a number ≥ 0" },
				{ status: 400 },
			);
		}

		const pursuit = await createPursuit({
			orgId: ctx.orgId,
			title,
			description: body.description ? String(body.description) : undefined,
			amount,
			currency: body.currency ? String(body.currency) : "USD",
			stage: isPursuitStage(body.stage) ? body.stage : "watching",
			source: isPursuitSource(body.source) ? body.source : "manual",
			samNoticeId: body.samNoticeId ? String(body.samNoticeId) : undefined,
			samUrl: body.samUrl ? String(body.samUrl) : undefined,
			responseDeadline: body.responseDeadline
				? String(body.responseDeadline)
				: undefined,
			ownerUserId: body.ownerUserId ? String(body.ownerUserId) : ctx.user.$id,
			ownerName: body.ownerName
				? String(body.ownerName)
				: ctx.user.fullName || ctx.user.name,
			department: body.department ? String(body.department) : undefined,
			notes: body.notes ? String(body.notes) : undefined,
			createdByUserId: ctx.user.$id,
			createdByName: ctx.user.fullName || ctx.user.name,
		});

		return NextResponse.json({ pursuit }, { status: 201 });
	} catch (error) {
		console.error("[funding/pursuits POST]", error);
		return NextResponse.json(
			{ error: "Failed to create pursuit" },
			{ status: 500 },
		);
	}
}
