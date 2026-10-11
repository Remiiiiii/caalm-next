import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import type { ObligationImportFieldKey } from "@/lib/funding/import/fields";
import { applyObligationColumnMapping } from "@/lib/funding/import/parse";
import {
	commitObligationImport,
	dryRunObligationImport,
} from "@/lib/funding/import/run-import";
import { requireFundingOrgContext } from "@/lib/funding/request-context";
import { readImportPayload } from "@/lib/import/http";

export async function POST(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	try {
		const parsed = readImportPayload<ObligationImportFieldKey>(
			await request.json(),
		);
		if (!parsed.ok) {
			return NextResponse.json(
				{ error: parsed.error },
				{ status: parsed.status },
			);
		}
		const { valid, errors } = applyObligationColumnMapping(
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
			const result = await dryRunObligationImport(ctx.orgId, valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}
		const result = await commitObligationImport(
			ctx.orgId,
			ctx.user.$id,
			ctx.user.fullName,
			valid,
		);
		return NextResponse.json({ ...result, rowErrors: errors });
	} catch (error) {
		console.error("[SERVER] funding/obligations/import POST:", error);
		return NextResponse.json(
			{ error: "Obligation import failed" },
			{ status: 500 },
		);
	}
}
