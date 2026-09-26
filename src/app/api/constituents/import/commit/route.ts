import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import { commitImportBatch } from "@/lib/constituents/import/commit.service";

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as { batchId?: string };
		if (!body.batchId?.trim()) {
			return NextResponse.json({ error: "batchId is required" }, { status: 400 });
		}

		const result = await commitImportBatch({
			orgId: ctx.orgId,
			batchId: body.batchId.trim(),
		});
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: result.status });
		}
		return NextResponse.json(result);
	} catch (error) {
		console.error("[constituents/import/commit POST]", error);
		return NextResponse.json({ error: "Import commit failed" }, { status: 500 });
	}
}
