import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { renewContractAfterExpiry } from "@/lib/renewals/renewDocument";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const { id } = await params;
	const orgId = getOrgIdFromRequest(request);
	const body = (await request.json()) as Record<string, unknown>;
	const newExpiryDate = String(body.newExpiryDate || body.renewalDate || "");
	if (!newExpiryDate) {
		return NextResponse.json(
			{ success: false, message: "New expiry date is required" },
			{ status: 400 },
		);
	}
	if (!orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	try {
		await renewContractAfterExpiry({
			contractId: id,
			orgId,
			newExpiryDate,
			notes: typeof body.notes === "string" ? body.notes : undefined,
			renewedBy: user.$id,
			userName: (user as { fullName?: string }).fullName,
			userEmail: user.email,
		});
		return NextResponse.json({ success: true });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to renew contract";
		const status = message.includes("attestation") ? 409 : 500;
		return NextResponse.json({ success: false, message }, { status });
	}
}
