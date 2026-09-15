import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createObligation,
	isObligationKind,
	isObligationStatus,
	listObligations,
} from "@/lib/funding";
import { requireFundingOrgContext } from "@/lib/funding/request-context";
import { parseAllowedHttpUrl } from "@/lib/funding/safe-link-url";

export async function GET(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const contractId =
		request.nextUrl.searchParams.get("contractId") || undefined;
	const statusParam = request.nextUrl.searchParams.get("status");
	const status = isObligationStatus(statusParam) ? statusParam : undefined;

	try {
		const items = await listObligations({
			orgId: ctx.orgId,
			contractId,
			status,
		});
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[funding/obligations GET]", error);
		return NextResponse.json(
			{ error: "Failed to list obligations" },
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
		const contractId = String(body.contractId || "").trim();
		if (!title || !contractId) {
			return NextResponse.json(
				{ error: "title and contractId are required" },
				{ status: 400 },
			);
		}

		let linkUrl: string | undefined;
		if (body.linkUrl != null && String(body.linkUrl).trim()) {
			const parsed = parseAllowedHttpUrl(String(body.linkUrl));
			if (!parsed) {
				return NextResponse.json(
					{ error: "Invalid link URL; use http or https" },
					{ status: 400 },
				);
			}
			linkUrl = parsed;
		}

		const obligation = await createObligation({
			orgId: ctx.orgId,
			contractId,
			contractName: body.contractName ? String(body.contractName) : undefined,
			title,
			description: body.description ? String(body.description) : undefined,
			kind: isObligationKind(body.kind) ? body.kind : "other",
			status: isObligationStatus(body.status) ? body.status : "open",
			ownerUserId: body.ownerUserId ? String(body.ownerUserId) : ctx.user.$id,
			ownerName: body.ownerName
				? String(body.ownerName)
				: ctx.user.fullName || ctx.user.name,
			dueDate: body.dueDate ? String(body.dueDate) : undefined,
			reminderDaysBefore:
				body.reminderDaysBefore != null
					? Number(body.reminderDaysBefore)
					: undefined,
			linkUrl,
			renewalLinked: Boolean(body.renewalLinked),
			createdByUserId: ctx.user.$id,
		});

		return NextResponse.json({ obligation }, { status: 201 });
	} catch (error) {
		console.error("[funding/obligations POST]", error);
		return NextResponse.json(
			{ error: "Failed to create obligation" },
			{ status: 500 },
		);
	}
}
