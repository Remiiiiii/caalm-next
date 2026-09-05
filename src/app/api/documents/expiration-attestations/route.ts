import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createPreExpiryAttestation,
	getAttestationForEntity,
	listAttestationsForOrg,
	type ExpirationReasonCategory,
} from "@/lib/approvals/ExpirationAttestationService";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.LICENSES.VIEW],
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const entityType = request.nextUrl.searchParams.get("entityType") as
		| "contract"
		| "license"
		| null;
	const entityId = request.nextUrl.searchParams.get("entityId");
	const status = request.nextUrl.searchParams.get("status") as
		| "pending"
		| "submitted"
		| "reviewed"
		| "waived"
		| null;

	if (entityType && entityId) {
		const attestation = await getAttestationForEntity(orgId, entityType, entityId);
		return NextResponse.json({ success: true, attestation });
	}

	const attestations = await listAttestationsForOrg(orgId, status || undefined);
	return NextResponse.json({ success: true, attestations });
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.LICENSES.EDIT],
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const orgId = getOrgIdFromRequest(request);
	const body = (await request.json()) as Record<string, unknown>;
	const resolvedOrgId = orgId || String(body.orgId || "");
	if (!resolvedOrgId) {
		return NextResponse.json(
			{ success: false, message: "Organization is required" },
			{ status: 400 },
		);
	}

	const narrative = String(body.narrative || "").trim();
	if (!narrative) {
		return NextResponse.json(
			{ success: false, message: "Narrative is required" },
			{ status: 400 },
		);
	}

	const attestation = await createPreExpiryAttestation({
		orgId: resolvedOrgId,
		entityType: (body.entityType as "contract" | "license") || "contract",
		entityId: String(body.entityId || ""),
		entityName: String(body.entityName || "Untitled"),
		reasonCategory: body.reasonCategory as ExpirationReasonCategory,
		narrative,
		accountableUserId: String(body.accountableUserId || user.$id),
		submittedBy: user.$id,
		priorExpiryDate: body.priorExpiryDate as string | undefined,
		signatureFileId: body.signatureFileId as string | undefined,
	});

	return NextResponse.json({ success: true, attestation });
}
