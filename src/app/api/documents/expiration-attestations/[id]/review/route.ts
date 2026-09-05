import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { reviewAttestation } from "@/lib/approvals/ExpirationAttestationService";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.APPROVALS.OVERRIDE, PERMISSIONS.SETTINGS.EDIT],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const { id } = await params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	const attestation = await reviewAttestation({
		id,
		reviewedBy: user.$id,
		notes: typeof body.notes === "string" ? body.notes : undefined,
	});

	return NextResponse.json({ success: true, attestation });
}
