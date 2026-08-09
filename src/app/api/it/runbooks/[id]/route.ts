import { z } from "zod";
import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	deleteRunbook,
	getRunbook,
	updateRunbook,
} from "@/lib/it/runbooks/store";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
	title: z.string().min(3).optional(),
	slug: z.string().optional(),
	summary: z.string().min(3).optional(),
	service: z.string().min(1).optional(),
	severity: z.enum(["low", "medium", "high", "critical"]).optional(),
	status: z.enum(["draft", "published", "archived"]).optional(),
	symptoms: z.array(z.string()).optional(),
	steps: z
		.array(
			z.object({
				title: z.string().min(1),
				body: z.string().min(1),
				command: z.string().optional(),
			}),
		)
		.min(1)
		.optional(),
	verification: z.string().min(3).optional(),
	escalation: z.string().min(3).optional(),
	tags: z.array(z.string()).optional(),
	integrationKeys: z.array(z.string()).optional(),
	lastReviewedAt: z.string().optional(),
});

export async function GET(_request: NextRequest, context: RouteContext) {
	const permissionCheck = await requirePermission(_request, {
		permission: PERMISSIONS.IT.VIEW_RUNBOOKS,
	});
	if (permissionCheck) return permissionCheck;

	const user = await getCurrentUser();
	if (!user) {
		return Response.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return Response.json({ error: "Organization not found" }, { status: 404 });
	}

	const { id } = await context.params;
	const { item, storage } = await getRunbook(org.orgId, id);
	if (!item) {
		return Response.json({ error: "Runbook not found" }, { status: 404 });
	}
	return Response.json({ item, storage });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.IT.MANAGE_RUNBOOKS,
	});
	if (permissionCheck) return permissionCheck;

	const user = await getCurrentUser();
	if (!user) {
		return Response.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return Response.json({ error: "Organization not found" }, { status: 404 });
	}

	const body = await request.json().catch(() => null);
	const parsed = updateSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid runbook update", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { id } = await context.params;
	const { item, storage } = await updateRunbook(org.orgId, id, parsed.data);
	if (!item) {
		return Response.json({ error: "Runbook not found" }, { status: 404 });
	}
	return Response.json({ item, storage });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.IT.MANAGE_RUNBOOKS,
	});
	if (permissionCheck) return permissionCheck;

	const user = await getCurrentUser();
	if (!user) {
		return Response.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return Response.json({ error: "Organization not found" }, { status: 404 });
	}

	const { id } = await context.params;
	const { ok, storage } = await deleteRunbook(org.orgId, id);
	if (!ok) {
		return Response.json({ error: "Runbook not found" }, { status: 404 });
	}
	return Response.json({ ok: true, storage });
}
