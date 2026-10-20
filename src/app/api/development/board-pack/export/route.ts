import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents/server";
import {
	buildBoardPackXlsxInput,
	computeDevelopmentMetrics,
	loadBoardPackCampaigns,
} from "@/lib/development";
import { xlsxResponse } from "@/lib/export/xlsx-response";

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
		return xlsxResponse(
			`development-board-pack-${metrics.year}.xlsx`,
			buildBoardPackXlsxInput(metrics, campaigns),
		);
	} catch (error) {
		console.error("[development/board-pack/export GET]", error);
		return NextResponse.json(
			{ error: "Failed to export board pack" },
			{ status: 500 },
		);
	}
}
