import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import {
	assertGrantFundIdOnSave,
	GrantFundValidationError,
} from "@/lib/funding/grant-fund";
import { setGrantFundIdForContract } from "@/lib/funding/grant-fund.repository";
import { requireFundingOrgContext } from "@/lib/funding/request-context";
import { assertFundInOrg } from "@/lib/funds";

type RouteContext = { params: Promise<{ contractId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;

	let body: { fundId?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	try {
		const contract = await loadContractForOrg(contractId, ctx.orgId);
		const contractType = String(contract.contractType || "");
		const fundId = body.fundId?.trim() ?? "";
		assertGrantFundIdOnSave({ contractType, fundId });
		if (fundId) {
			await assertFundInOrg(ctx.orgId, fundId);
		}

		const saved = await setGrantFundIdForContract({
			orgId: ctx.orgId,
			contractId,
			fundId: fundId || null,
		});
		return NextResponse.json({ contractId, fundId: saved });
	} catch (error) {
		if (error instanceof GrantFundValidationError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[funding/contracts/fund PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update grant fund" },
			{ status: 500 },
		);
	}
}
