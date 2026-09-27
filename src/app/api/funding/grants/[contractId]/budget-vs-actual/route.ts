import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { budgetVsActual } from "@/lib/funding/budget-vs-actual";
import { listBudgetLinesForGrant } from "@/lib/funding/grant-budget.repository";
import { listObligations } from "@/lib/funding/obligation.repository";
import { requireFundingOrgContext } from "@/lib/funding/request-context";
import { listPostedGiftsForContract } from "@/lib/gifts/contract-gifts";

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
		const [budgetLines, obligations, gifts] = await Promise.all([
			listBudgetLinesForGrant(ctx.orgId, contractId),
			listObligations({ orgId: ctx.orgId, contractId }),
			listPostedGiftsForContract(ctx.orgId, contractId),
		]);

		const result = budgetVsActual({
			budgetLines,
			obligations: obligations.map((o) => ({
				status: o.status,
				kind: o.kind,
				actualAmount: o.actualAmount,
			})),
			gifts: gifts.items.map((g) => ({
				amount: g.amount,
				status: g.status,
				voidOfId: g.voidOfId,
			})),
		});
		return NextResponse.json(result);
	} catch {
		return NextResponse.json({ error: "Grant not found" }, { status: 404 });
	}
}
