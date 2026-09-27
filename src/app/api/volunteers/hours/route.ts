import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listHoursForGrant, requireVolunteerOrgContext } from "@/lib/volunteers";

export async function GET(request: NextRequest) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const grantContractId = request.nextUrl.searchParams
		.get("grantContractId")
		?.trim();
	if (!grantContractId) {
		return NextResponse.json(
			{ error: "grantContractId query parameter is required" },
			{ status: 400 },
		);
	}

	const items = await listHoursForGrant(ctx.orgId, grantContractId);
	return NextResponse.json({ items });
}
