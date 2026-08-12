import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	softDeleteOrgUnit,
	updateOrgUnit,
} from "@/lib/org/org-units.service";
import type { OrgUnitType } from "@/lib/database/schemas/org-units.schema";
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
		const unit = await updateOrgUnit(id, {
			name: body.name,
			parentId: body.parentId,
			active: body.active,
			sortOrder: body.sortOrder,
			type: body.type as OrgUnitType | undefined,
		});
		return NextResponse.json({ success: true, data: { unit } });
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
		const unit = await softDeleteOrgUnit(id);
		return NextResponse.json({ success: true, data: { unit } });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
