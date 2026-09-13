import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getLatestEnvelopeForResource } from "@/lib/esign/envelope-service";
import { loadEsignResource } from "@/lib/esign/resource";
import type { EsignResourceType } from "@/lib/esign/types";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [PERMISSIONS.CONTRACTS.SIGN, PERMISSIONS.LICENSES.SIGN],
	});
	if (denied) return denied;

	const resourceTypeParam = request.nextUrl.searchParams.get("resourceType");
	const resourceId = request.nextUrl.searchParams.get("resourceId") || "";
	const resourceType: EsignResourceType =
		resourceTypeParam === "license" ? "license" : "contract";

	if (!resourceId) {
		return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
	}

	const resource = await loadEsignResource(resourceType, resourceId);
	if (!resource) {
		return NextResponse.json({ error: "Document not found" }, { status: 404 });
	}

	const envelope = await getLatestEnvelopeForResource(resourceType, resourceId);
	return NextResponse.json({ envelope, resource });
}
