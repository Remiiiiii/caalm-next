import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import {
	buildBoardPackCsv,
	computeDevelopmentMetrics,
	loadBoardPackCampaigns,
} from "@/lib/development";

export async function GET(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const [metrics, campaigns] = await Promise.all([
			computeDevelopmentMetrics(ctx.orgId),
			loadBoardPackCampaigns(ctx.orgId),
		]);
		const csv = buildBoardPackCsv(metrics, campaigns);
		return new NextResponse(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="development-board-pack-${metrics.year}.csv"`,
			},
		});
	} catch (error) {
		console.error("[development/board-pack/export GET]", error);
		return NextResponse.json(
			{ error: "Failed to export board pack" },
			{ status: 500 },
		);
	}
}
