import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import type { FundImportFieldKey } from "@/lib/funds/import/fields";
import { applyFundColumnMapping } from "@/lib/funds/import/parse";
import {
	commitFundImport,
	dryRunFundImport,
} from "@/lib/funds/import/run-import";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

type ImportBody = {
	rows?: Record<string, string>[];
	mapping?: Record<string, FundImportFieldKey | "">;
};

export async function POST(request: NextRequest) {
	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	const permission = dryRun
		? PERMISSIONS.FUNDING.VIEW
		: PERMISSIONS.FUNDING.MANAGE;
	const ctx = await requireFundingOrgContext(request, permission);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as ImportBody;
		const rows = Array.isArray(body.rows) ? body.rows : [];
		const mapping =
			body.mapping && typeof body.mapping === "object" ? body.mapping : {};

		if (rows.length === 0) {
			return NextResponse.json({ error: "No CSV rows provided" }, { status: 400 });
		}
		if (rows.length > 500) {
			return NextResponse.json(
				{ error: "Import limited to 500 rows per batch" },
				{ status: 400 },
			);
		}

		const { valid, errors } = applyFundColumnMapping(rows, mapping);
		if (valid.length === 0) {
			return NextResponse.json(
				{ error: "No valid rows after mapping", rowErrors: errors },
				{ status: 400 },
			);
		}

		if (dryRun) {
			const result = await dryRunFundImport(ctx.orgId, valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}

		const result = await commitFundImport(ctx.orgId, valid);
		return NextResponse.json({
			...result,
			rowErrors: errors,
			createdCount: result.created.length,
			skippedCount: result.skipped.length,
		});
	} catch (error) {
		console.error("[funds import POST]", error);
		return NextResponse.json({ error: "Fund import failed" }, { status: 500 });
	}
}
