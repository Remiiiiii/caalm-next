import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import {
	createBudgetLine,
	listBudgetLinesForGrant,
} from "@/lib/funding/grant-budget.repository";
import { GRANT_BUDGET_CATEGORIES } from "@/lib/funding/grant-budget.types";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

type RouteContext = { params: Promise<{ contractId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;

	try {
		await loadContractForOrg(contractId, ctx.orgId);
		const items = await listBudgetLinesForGrant(ctx.orgId, contractId);
		return NextResponse.json({ items });
	} catch {
		return NextResponse.json({ error: "Grant not found" }, { status: 404 });
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;

	let body: {
		category?: string;
		amount?: number;
		periodStart?: string;
		periodEnd?: string;
		label?: string;
	};
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const category = body.category;
	if (
		typeof category !== "string" ||
		!(GRANT_BUDGET_CATEGORIES as readonly string[]).includes(category)
	) {
		return NextResponse.json({ error: "Valid category is required" }, { status: 400 });
	}

	try {
		const line = await createBudgetLine({
			orgId: ctx.orgId,
			contractId,
			category: category as (typeof GRANT_BUDGET_CATEGORIES)[number],
			amount: Number(body.amount),
			periodStart: String(body.periodStart || ""),
			periodEnd: String(body.periodEnd || ""),
			label: body.label,
		});
		return NextResponse.json(line, { status: 201 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create budget line";
		const status = message.includes("not found") ? 404 : 400;
		return NextResponse.json({ error: message }, { status });
	}
}
