import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createFund,
	ensureDefaultUnrestrictedFund,
	isNetAssetClass,
	listFundsForOrg,
} from "@/lib/funds";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

export async function GET(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	try {
		await ensureDefaultUnrestrictedFund(ctx.orgId);
		const items = await listFundsForOrg(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[funds GET]", error);
		return NextResponse.json({ error: "Failed to load funds" }, { status: 500 });
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
		const code = String(body.code || "").trim();
		const name = String(body.name || "").trim();
		const netAssetClass = body.netAssetClass;
		if (!code || !name || !isNetAssetClass(netAssetClass)) {
			return NextResponse.json(
				{ error: "code, name, and netAssetClass are required" },
				{ status: 400 },
			);
		}
		const fund = await createFund({
			orgId: ctx.orgId,
			code,
			name,
			netAssetClass,
		});
		return NextResponse.json(fund, { status: 201 });
	} catch (error) {
		console.error("[funds POST]", error);
		return NextResponse.json({ error: "Failed to create fund" }, { status: 500 });
	}
}
