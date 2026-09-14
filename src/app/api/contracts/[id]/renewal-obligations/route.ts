import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { buildRenewalObligationsForContract } from "@/lib/funding/obligation-renewal.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const { id: contractId } = await context.params;
	if (!contractId?.trim()) {
		return NextResponse.json(
			{ error: "Contract ID is required" },
			{ status: 400 },
		);
	}

	try {
		const result = await buildRenewalObligationsForContract({
			orgId: org.orgId,
			contractId: contractId.trim(),
		});
		return NextResponse.json(result);
	} catch (error) {
		console.error("[contracts/renewal-obligations GET]", error);
		return NextResponse.json(
			{ error: "Failed to load renewal obligations" },
			{ status: 500 },
		);
	}
}
