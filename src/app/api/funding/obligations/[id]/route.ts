import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	deleteObligation,
	getObligationById,
	isObligationKind,
	isObligationStatus,
	updateObligation,
} from "@/lib/funding";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.FUNDING.MANAGE,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const { id } = await context.params;
	const existing = await getObligationById(id);
	if (!existing || existing.orgId !== org.orgId) {
		return NextResponse.json({ error: "Obligation not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const patch: Record<string, unknown> = {};
		if (body.title != null) patch.title = String(body.title).slice(0, 256);
		if (body.description != null) patch.description = String(body.description);
		if (isObligationKind(body.kind)) patch.kind = body.kind;
		if (isObligationStatus(body.status)) patch.status = body.status;
		if (body.dueDate != null) patch.dueDate = String(body.dueDate);
		if (body.ownerUserId != null) patch.ownerUserId = String(body.ownerUserId);
		if (body.ownerName != null) patch.ownerName = String(body.ownerName);
		if (body.renewalLinked != null) patch.renewalLinked = Boolean(body.renewalLinked);
		if (body.linkUrl != null) patch.linkUrl = String(body.linkUrl);

		const obligation = await updateObligation(id, patch);
		return NextResponse.json({ obligation });
	} catch (error) {
		console.error("[funding/obligations PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update obligation" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.FUNDING.MANAGE,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const { id } = await context.params;
	const existing = await getObligationById(id);
	if (!existing || existing.orgId !== org.orgId) {
		return NextResponse.json({ error: "Obligation not found" }, { status: 404 });
	}

	try {
		await deleteObligation(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[funding/obligations DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to delete obligation" },
			{ status: 500 },
		);
	}
}
