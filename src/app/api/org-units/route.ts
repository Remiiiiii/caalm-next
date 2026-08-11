import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createOrgUnit, listOrgUnits } from "@/lib/org/org-units.service";
import type { OrgUnitType } from "@/lib/database/schemas/org-units.schema";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

async function canReadOrgUnits(userId: string, orgId?: string) {
	const checks = [
		PERMISSIONS.SETTINGS.VIEW,
		PERMISSIONS.SETTINGS.EDIT,
		PERMISSIONS.USERS.INVITE,
		PERMISSIONS.USERS.EDIT,
	];
	for (const permission of checks) {
		if (await hasPermission(userId, permission, orgId)) return true;
	}
	return false;
}

export async function GET(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const orgId =
		request.nextUrl.searchParams.get("orgId") ||
		request.headers.get("x-org-id") ||
		undefined;

	const allowed = await canReadOrgUnits(user.$id, orgId || undefined);
	if (!allowed) {
		return NextResponse.json(
			{ error: "Insufficient permissions" },
			{ status: 403 },
		);
	}

	if (!orgId) {
		return NextResponse.json({ error: "orgId is required" }, { status: 400 });
	}

	try {
		const includeInactive =
			request.nextUrl.searchParams.get("includeInactive") === "true";
		const units = await listOrgUnits(orgId, { includeInactive });
		return NextResponse.json({ success: true, data: { units } });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	try {
		const body = await request.json();
		const orgId =
			body.orgId ||
			request.nextUrl.searchParams.get("orgId") ||
			request.headers.get("x-org-id");
		if (!orgId || !body.code || !body.name || !body.type) {
			return NextResponse.json(
				{ error: "orgId, code, name, and type are required" },
				{ status: 400 },
			);
		}
		const unit = await createOrgUnit({
			orgId,
			code: body.code,
			name: body.name,
			type: body.type as OrgUnitType,
			parentId: body.parentId ?? null,
			sortOrder: body.sortOrder,
		});
		return NextResponse.json({ success: true, data: { unit } }, { status: 201 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
