import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { updateCostCenter } from "@/lib/org/org-units.service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	try {
		const { id } = await params;
		const body = await request.json();
		const costCenter = await updateCostCenter(id, {
			name: body.name,
			code: body.code,
			active: body.active,
		});
		return NextResponse.json({ success: true, data: { costCenter } });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	try {
		const { id } = await params;
		const costCenter = await updateCostCenter(id, { active: false });
		return NextResponse.json({ success: true, data: { costCenter } });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
