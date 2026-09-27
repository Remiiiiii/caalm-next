import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import { computeDevelopmentMetrics } from "@/lib/development";

export async function GET(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const metrics = await computeDevelopmentMetrics(ctx.orgId);
		return NextResponse.json(metrics);
	} catch (error) {
		console.error("[SERVER] development metrics GET:", error);
		return NextResponse.json(
			{ error: "Failed to load development metrics" },
			{ status: 500 },
		);
	}
}
