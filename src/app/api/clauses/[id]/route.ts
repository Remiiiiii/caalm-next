import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	archiveClause,
	getClauseById,
	isClauseCategory,
	isClauseStatus,
	updateClause,
} from "@/lib/clauses/clause-library.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedClause(id: string, orgId: string) {
	const existing = await getClauseById(id);
	if (!existing || existing.orgId !== orgId) {
		return null;
	}
	return existing;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.VIEW,
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
	const clause = await loadOwnedClause(id, org.orgId);
	if (!clause) {
		return NextResponse.json({ error: "Clause not found" }, { status: 404 });
	}
	return NextResponse.json({ clause });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.EDIT,
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
	const existing = await loadOwnedClause(id, org.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Clause not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const clause = await updateClause({
			clause: existing,
			userId: user.$id,
			data: {
				title: body.title != null ? String(body.title) : undefined,
				body: body.body != null ? String(body.body) : undefined,
				category: isClauseCategory(body.category) ? body.category : undefined,
				status: isClauseStatus(body.status) ? body.status : undefined,
				changeNote:
					body.changeNote != null ? String(body.changeNote) : undefined,
			},
		});
		return NextResponse.json({ clause });
	} catch (error) {
		console.error("[clauses PATCH]", error);
		const message =
			error instanceof Error ? error.message : "Failed to update clause";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.DELETE,
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
	const existing = await loadOwnedClause(id, org.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Clause not found" }, { status: 404 });
	}

	try {
		const clause = await archiveClause({
			clause: existing,
			userId: user.$id,
		});
		return NextResponse.json({ clause });
	} catch (error) {
		console.error("[clauses DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to archive clause" },
			{ status: 500 },
		);
	}
}
