import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	funderSnapshotToCsv,
	loadFunderSnapshot,
} from "@/lib/funding/funder-snapshot";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

type RouteContext = { params: Promise<{ contractId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;

	try {
		const snapshot = await loadFunderSnapshot(ctx.orgId, contractId);

		const format = request.nextUrl.searchParams.get("format");
		if (format === "csv") {
			const safeName = snapshot.contractName
				.replace(/[^\w.-]+/g, "-")
				.slice(0, 48);
			return new NextResponse(funderSnapshotToCsv(snapshot), {
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Content-Disposition": `attachment; filename="funder-snapshot-${safeName || contractId}.csv"`,
				},
			});
		}

		return NextResponse.json(snapshot);
	} catch {
		return NextResponse.json({ error: "Grant not found" }, { status: 404 });
	}
}
