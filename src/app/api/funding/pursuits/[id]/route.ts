import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	deletePursuit,
	getPursuitById,
	isPursuitStage,
	updatePursuit,
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
	const existing = await getPursuitById(id);
	if (!existing || existing.orgId !== org.orgId) {
		return NextResponse.json({ error: "Pursuit not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const patch: Record<string, unknown> = {};
		if (body.title != null) patch.title = String(body.title).slice(0, 256);
		if (body.description != null) patch.description = String(body.description);
		if (body.amount != null) {
			const amount = Number(body.amount);
			if (!Number.isFinite(amount) || amount < 0) {
				return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
			}
			patch.amount = amount;
		}
		if (isPursuitStage(body.stage)) patch.stage = body.stage;
		if (body.notes != null) patch.notes = String(body.notes);
		if (body.ownerUserId != null) patch.ownerUserId = String(body.ownerUserId);
		if (body.ownerName != null) patch.ownerName = String(body.ownerName);
		if (body.department != null) patch.department = String(body.department);
		if (body.responseDeadline != null) {
			patch.responseDeadline = String(body.responseDeadline);
		}

		const pursuit = await updatePursuit(id, patch);
		return NextResponse.json({ pursuit });
	} catch (error) {
		console.error("[funding/pursuits PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update pursuit" },
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
	const existing = await getPursuitById(id);
	if (!existing || existing.orgId !== org.orgId) {
		return NextResponse.json({ error: "Pursuit not found" }, { status: 404 });
	}

	try {
		await deletePursuit(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[funding/pursuits DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to delete pursuit" },
			{ status: 500 },
		);
	}
}
