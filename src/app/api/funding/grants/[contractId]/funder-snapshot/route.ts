import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { xlsxResponse } from "@/lib/export/xlsx-response";
import {
	funderSnapshotToXlsxInput,
	loadFunderSnapshot,
} from "@/lib/funding/funder-snapshot";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

type RouteContext = { params: Promise<{ contractId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(request, PERMISSIONS.FUNDING.VIEW);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;

	try {
		const snapshot = await loadFunderSnapshot(ctx.orgId, contractId);

		const format = request.nextUrl.searchParams.get("format");
		if (format === "xlsx") {
			const safeName = snapshot.contractName
				.replace(/[^\w.-]+/g, "-")
				.slice(0, 48);
			return xlsxResponse(
				`funder-snapshot-${safeName || contractId}.xlsx`,
				funderSnapshotToXlsxInput(snapshot),
			);
		}

		return NextResponse.json(snapshot);
	} catch {
		return NextResponse.json({ error: "Grant not found" }, { status: 404 });
	}
}
