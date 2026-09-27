import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	approveVolunteerHourLog,
	assertGrantContractInOrg,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

type RouteContext = { params: Promise<{ hourId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { hourId } = await context.params;
	try {
		const body = await request.json().catch(() => ({}));
		const grantContractId = body.grantContractId
			? String(body.grantContractId).trim()
			: undefined;
		if (grantContractId) {
			try {
				await assertGrantContractInOrg(ctx.orgId, grantContractId);
			} catch {
				return NextResponse.json(
					{ error: "Grant contract not found in this organization" },
					{ status: 404 },
				);
			}
		}

		const hour = await approveVolunteerHourLog({
			orgId: ctx.orgId,
			hourId,
			approvedByUserId: ctx.user.$id,
			grantContractId,
		});
		if (!hour) {
			return NextResponse.json({ error: "Hour log not found" }, { status: 404 });
		}
		return NextResponse.json({ hour });
	} catch (error) {
		console.error("[volunteers/hours approve POST]", error);
		return NextResponse.json(
			{ error: "Failed to approve hours" },
			{ status: 500 },
		);
	}
}
