import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	buildJournalExport,
	journalExportToCsv,
	journalExportToIif,
} from "@/lib/funding/journal-export";
import { requireFundingOrgContext } from "@/lib/funding/request-context";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function GET(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const startDate = request.nextUrl.searchParams.get("startDate")?.trim();
	const endDate = request.nextUrl.searchParams.get("endDate")?.trim();
	const format = request.nextUrl.searchParams.get("format") || "csv";

	if (!startDate || !endDate) {
		return NextResponse.json(
			{ error: "startDate and endDate query params are required" },
			{ status: 400 },
		);
	}

	try {
		const result = await buildJournalExport({
			orgId: ctx.orgId,
			startDate,
			endDate,
		});

		if (format === "meta") {
			return NextResponse.json({
				giftRowCount: result.giftRowCount,
				reclassReleaseCount: result.reclassReleaseCount,
				giftCashTotal: result.giftCashTotal,
				rowCount: result.rows.length,
			});
		}

		await logAuditEvent({
			event_id: `journal_export_${ctx.orgId}_${startDate}_${endDate}_${Date.now()}`,
			event_title: "Finance journal export",
			action: "export",
			source: "caalm",
			user_id: ctx.user.$id,
			user_name:
				("fullName" in ctx.user && ctx.user.fullName) ||
				ctx.user.name ||
				"User",
			user_email: ctx.user.email || "",
			orgId: ctx.orgId,
			status: "success",
			module: "regulatory",
			target_type: "journal_export",
			target_id: `${startDate}_${endDate}`,
			target_label: "Journal export",
			summary: `${("fullName" in ctx.user && ctx.user.fullName) || ctx.user.name || "User"} exported ${result.rows.length} journal rows (${result.giftRowCount} gifts) for ${startDate} through ${endDate}`,
			metadata: {
				startDate,
				endDate,
				rowCount: result.rows.length,
				giftRowCount: result.giftRowCount,
				reclassReleaseCount: result.reclassReleaseCount,
				format: format === "iif" ? "iif" : "csv",
			},
		});

		if (format === "iif") {
			return new NextResponse(journalExportToIif(result), {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"Content-Disposition": `attachment; filename="journal-export-${startDate}-${endDate}.iif"`,
				},
			});
		}

		return new NextResponse(journalExportToCsv(result), {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="journal-export-${startDate}-${endDate}.csv"`,
			},
		});
	} catch (error) {
		console.error("[journal-export GET]", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Export failed" },
			{ status: 500 },
		);
	}
}
