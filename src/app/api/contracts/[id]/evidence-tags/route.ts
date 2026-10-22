import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	handleListEvidenceTags,
	handleReplaceEvidenceTags,
} from "@/lib/audits/readiness/evidence-tags-api";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;
	const { id } = await params;
	return handleListEvidenceTags(request, "contract", id);
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;
	const { id } = await params;
	return handleReplaceEvidenceTags(request, "contract", id);
}
