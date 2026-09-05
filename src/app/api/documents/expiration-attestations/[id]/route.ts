import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getAttestationById,
	submitAttestation,
	type ExpirationReasonCategory,
	type AttestationIntent,
} from "@/lib/approvals/ExpirationAttestationService";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.LICENSES.VIEW],
	});
	if (denied) return denied;

	const { id } = await params;
	const attestation = await getAttestationById(id);
	if (!attestation) {
		return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true, attestation });
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.LICENSES.EDIT],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const { id } = await params;
	const body = (await request.json()) as Record<string, unknown>;
	const narrative = String(body.narrative || "").trim();
	if (!narrative) {
		return NextResponse.json(
			{ success: false, message: "Narrative is required" },
			{ status: 400 },
		);
	}

	const attestation = await submitAttestation({
		id,
		submittedBy: user.$id,
		reasonCategory: body.reasonCategory as ExpirationReasonCategory,
		narrative,
		intent: body.intent as AttestationIntent | undefined,
		signatureFileId: body.signatureFileId as string | undefined,
	});

	return NextResponse.json({ success: true, attestation });
}
