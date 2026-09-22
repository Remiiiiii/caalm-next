import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import { getSegmentForConstituent } from "@/lib/fundraising/segments-repository";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.AI.FUNDRAISING,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	try {
		const row = await getSegmentForConstituent(ctx.orgId, id);
		if (!row) {
			return NextResponse.json(
				{ error: "Scores not computed yet" },
				{ status: 404 },
			);
		}
		const featureWeights = JSON.parse(row.featureWeightsJson) as Array<{
			label: string;
			weight: number;
			direction: string;
		}>;
		const topFeatures = [...featureWeights]
			.sort((a, b) => b.weight - a.weight)
			.slice(0, 3);
		return NextResponse.json({
			constituentId: id,
			segment: row.segment,
			computedAt: row.computedAt,
			lapseRiskScore: row.lapseRiskScore,
			topFeatures,
			featureWeights,
		});
	} catch (error) {
		console.error("[SERVER] fundraising-intelligence GET:", error);
		return NextResponse.json(
			{ error: "Failed to load fundraising intelligence" },
			{ status: 500 },
		);
	}
}
