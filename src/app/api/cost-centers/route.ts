import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createCostCenter, listCostCenters } from "@/lib/org/org-units.service";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { hasPermission } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

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
	const allowed =
		(await hasPermission(user.$id, PERMISSIONS.SETTINGS.VIEW, orgId)) ||
		(await hasPermission(user.$id, PERMISSIONS.USERS.EDIT, orgId));
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
		const costCenters = await listCostCenters(orgId, { includeInactive });
		return NextResponse.json({ success: true, data: { costCenters } });
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
		if (!orgId || !body.code || !body.name) {
			return NextResponse.json(
				{ error: "orgId, code, and name are required" },
				{ status: 400 },
			);
		}
		const costCenter = await createCostCenter({
			orgId,
			code: body.code,
			name: body.name,
		});
		return NextResponse.json(
			{ success: true, data: { costCenter } },
			{ status: 201 },
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
