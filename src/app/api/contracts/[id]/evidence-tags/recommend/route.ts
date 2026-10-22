import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { handleRecommendEvidenceTags } from "@/lib/audits/readiness/evidence-tags-api";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;
	const { id } = await params;
	return handleRecommendEvidenceTags(request, "contract", id);
}
