import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import { listStewardshipQueue } from "@/lib/stewardship";

export async function GET(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const items = await listStewardshipQueue(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[SERVER] stewardship queue GET:", error);
		return NextResponse.json(
			{ error: "Failed to load stewardship queue" },
			{ status: 500 },
		);
	}
}
