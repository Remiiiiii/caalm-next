import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createClause,
	isClauseCategory,
	isClauseStatus,
	listClauses,
} from "@/lib/clauses/clause-library.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
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

	const { searchParams } = request.nextUrl;
	const categoryParam = searchParams.get("category");
	const statusParam = searchParams.get("status");
	const status = isClauseStatus(statusParam) ? statusParam : undefined;

	try {
		const items = await listClauses({
			orgId: org.orgId,
			familyId: searchParams.get("familyId") || undefined,
			category: isClauseCategory(categoryParam) ? categoryParam : undefined,
			status,
			search: searchParams.get("search") || undefined,
			// Archived rows set isCurrent=false, so skip the current-only default.
			currentOnly: status === "archived" ? false : undefined,
		});
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[clauses GET]", error);
		return NextResponse.json(
			{ error: "Failed to list clauses" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CLAUSES.CREATE,
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

	try {
		const body = await request.json();
		const title = String(body.title || "").trim();
		const clauseBody = String(body.body || "").trim();
		if (!title || !clauseBody) {
			return NextResponse.json(
				{ error: "title and body are required" },
				{ status: 400 },
			);
		}
		if (!isClauseCategory(body.category)) {
			return NextResponse.json({ error: "Invalid category" }, { status: 400 });
		}

		const clause = await createClause({
			orgId: org.orgId,
			userId: user.$id,
			data: {
				title,
				category: body.category,
				body: clauseBody,
				status: isClauseStatus(body.status) ? body.status : "draft",
				changeNote: body.changeNote ? String(body.changeNote) : undefined,
			},
		});
		return NextResponse.json({ clause }, { status: 201 });
	} catch (error) {
		console.error("[clauses POST]", error);
		const message =
			error instanceof Error ? error.message : "Failed to create clause";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
