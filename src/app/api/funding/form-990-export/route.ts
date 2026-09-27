import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { collectForm990ExpenseLines } from "@/lib/funding/form-990/collect-lines";
import { listForm990Mappings } from "@/lib/funding/form-990/mapping.repository";
import {
	buildForm990Worksheet,
	exceptionsToCsv,
	worksheetToCsv,
} from "@/lib/funding/form-990/worksheet";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

export async function GET(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const startDate = request.nextUrl.searchParams.get("startDate")?.trim();
	const endDate = request.nextUrl.searchParams.get("endDate")?.trim();
	const part = request.nextUrl.searchParams.get("part") || "worksheet";

	if (!startDate || !endDate) {
		return NextResponse.json(
			{ error: "startDate and endDate query params are required" },
			{ status: 400 },
		);
	}

	try {
		const [lines, mappings] = await Promise.all([
			collectForm990ExpenseLines({
				orgId: ctx.orgId,
				startDate,
				endDate,
			}),
			listForm990Mappings(ctx.orgId),
		]);
		const result = buildForm990Worksheet({ lines, mappings });

		if (part === "exceptions") {
			return new NextResponse(exceptionsToCsv(result), {
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Content-Disposition": `attachment; filename="990-worksheet-exceptions.csv"`,
				},
			});
		}

		if (part === "meta") {
			return NextResponse.json({
				taggedLineCount: result.taggedLineCount,
				worksheetRowCount: result.worksheetRows.length,
				exceptionCount: result.exceptions.length,
				buckets: result.buckets,
			});
		}

		return new NextResponse(worksheetToCsv(result), {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="990-part-ix-worksheet.csv"`,
			},
		});
	} catch (error) {
		console.error("[form-990-export GET]", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Export failed" },
			{ status: 500 },
		);
	}
}
