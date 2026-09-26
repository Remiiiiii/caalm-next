import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import { createImportBatch } from "@/lib/constituents/import/batch.repository";
import { importErrorsToCsv } from "@/lib/constituents/import/dry-run";
import { runConstituentImportDryRun } from "@/lib/constituents/import/run-dry-run";
import type { ImportFieldKey } from "@/lib/constituents/import/fields";

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	if (!dryRun) {
		return NextResponse.json(
			{ error: "Use ?dryRun=1 for import preview" },
			{ status: 400 },
		);
	}

	try {
		const body = (await request.json()) as {
			rows?: Record<string, string>[];
			mapping?: Record<string, ImportFieldKey | "">;
		};
		if (!body.rows?.length || !body.mapping) {
			return NextResponse.json(
				{ error: "rows and mapping are required" },
				{ status: 400 },
			);
		}

		const result = await runConstituentImportDryRun({
			orgId: ctx.orgId,
			rows: body.rows,
			mapping: body.mapping,
		});

		const batch = await createImportBatch({
			orgId: ctx.orgId,
			createdByUserId: ctx.user.$id,
			payload: result,
		});

		return NextResponse.json({
			batchId: batch.$id,
			counts: result.counts,
			errorsCsv: importErrorsToCsv(result.plans),
			expiresAt: batch.expiresAt,
		});
	} catch (error) {
		console.error("[constituents/import POST dryRun]", error);
		return NextResponse.json(
			{ error: "Import dry-run failed" },
			{ status: 500 },
		);
	}
}
