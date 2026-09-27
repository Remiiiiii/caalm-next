import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listDesignationsForOrg } from "@/lib/designations";
import { requireGiftOrgContext } from "@/lib/gifts";

export async function GET(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.VIEW);
	if (!ctx.ok) return ctx.response;

	try {
		const items = await listDesignationsForOrg(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[SERVER] gifts/designations GET:", error);
		return NextResponse.json(
			{ error: "Failed to load designations" },
			{ status: 500 },
		);
	}
}
