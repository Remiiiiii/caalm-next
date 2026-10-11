import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import type { CampaignImportFieldKey } from "@/lib/campaigns/import/fields";
import { applyCampaignColumnMapping } from "@/lib/campaigns/import/parse";
import {
	commitCampaignImport,
	dryRunCampaignImport,
} from "@/lib/campaigns/import/run-import";
import { requireGiftOrgContext } from "@/lib/gifts/request-context";
import { readImportPayload } from "@/lib/import/http";

export async function POST(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;
	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	try {
		const parsed = readImportPayload<CampaignImportFieldKey>(
			await request.json(),
		);
		if (!parsed.ok) {
			return NextResponse.json(
				{ error: parsed.error },
				{ status: parsed.status },
			);
		}
		const { valid, errors } = applyCampaignColumnMapping(
			parsed.rows,
			parsed.mapping,
		);
		if (valid.length === 0) {
			return NextResponse.json(
				{ error: "No valid rows after mapping", rowErrors: errors },
				{ status: 400 },
			);
		}
		if (dryRun) {
			const result = await dryRunCampaignImport(ctx.orgId, valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}
		const result = await commitCampaignImport(ctx.orgId, valid);
		return NextResponse.json({ ...result, rowErrors: errors });
	} catch (error) {
		console.error("[SERVER] campaigns/import POST:", error);
		return NextResponse.json(
			{ error: "Campaign import failed" },
			{ status: 500 },
		);
	}
}
