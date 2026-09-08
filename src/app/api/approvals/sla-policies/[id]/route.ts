import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteSlaPolicy,
	updateSlaPolicy,
} from "@/lib/approvals/ApprovalSlaService";
import { requireStepUpForSession } from "@/lib/auth/step-up";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	const { id } = await params;
	const body = (await request.json()) as Record<string, unknown>;
	const policy = await updateSlaPolicy(id, body);
	return NextResponse.json({ success: true, policy });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	const stepUpCheck = await requireStepUpForSession(request);
	if (stepUpCheck) return stepUpCheck;

	const { id } = await params;
	await deleteSlaPolicy(id);
	return NextResponse.json({ success: true });
}
