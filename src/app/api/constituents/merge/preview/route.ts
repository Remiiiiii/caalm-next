import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	previewConstituentMerge,
	requireConstituentOrgContext,
} from "@/lib/constituents";

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const winnerId = String(body.winnerId || "").trim();
		const loserId = String(body.loserId || "").trim();
		if (!winnerId || !loserId) {
			return NextResponse.json(
				{ error: "winnerId and loserId are required" },
				{ status: 400 },
			);
		}

		const result = await previewConstituentMerge({
			winnerId,
			loserId,
			orgId: ctx.orgId,
		});
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: result.status });
		}
		return NextResponse.json({ preview: result.preview });
	} catch (error) {
		console.error("[SERVER] constituent merge preview:", error);
		return NextResponse.json(
			{ error: "Failed to preview merge" },
			{ status: 500 },
		);
	}
}
