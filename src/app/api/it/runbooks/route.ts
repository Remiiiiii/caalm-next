import { z } from "zod";
import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getRunbookIntegrationStatuses,
	matchAlertToRunbooks,
} from "@/lib/it/runbooks/integrations";
import { createRunbook, listRunbooks } from "@/lib/it/runbooks/store";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

const stepSchema = z.object({
	title: z.string().min(1),
	body: z.string().min(1),
	command: z.string().optional(),
});

const createSchema = z.object({
	title: z.string().min(3),
	slug: z.string().optional(),
	summary: z.string().min(3),
	service: z.string().min(1),
	severity: z.enum(["low", "medium", "high", "critical"]),
	status: z.enum(["draft", "published", "archived"]).optional(),
	symptoms: z.array(z.string()).default([]),
	steps: z.array(stepSchema).min(1),
	verification: z.string().min(3),
	escalation: z.string().min(3),
	tags: z.array(z.string()).optional(),
	integrationKeys: z.array(z.string()).optional(),
});

const matchSchema = z.object({
	provider: z.enum(["pagerduty", "opsgenie", "monitoring"]),
	service: z.string().optional(),
	title: z.string().optional(),
	severity: z.string().optional(),
	raw: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
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

	const { searchParams } = new URL(request.url);
	const { items, storage } = await listRunbooks(org.orgId, {
		search: searchParams.get("search") || undefined,
		service: searchParams.get("service") || undefined,
		severity: (searchParams.get("severity") as
			| "low"
			| "medium"
			| "high"
			| "critical"
			| null) || undefined,
		status: (searchParams.get("status") as
			| "draft"
			| "published"
			| "archived"
			| null) || undefined,
		limit: Number(searchParams.get("limit") || 100),
		offset: Number(searchParams.get("offset") || 0),
	});

	return Response.json({
		items,
		storage,
		integrations: getRunbookIntegrationStatuses(),
	});
}

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	// Alert match helper (integrations)
	if ("action" in body && body.action === "match-alert") {
		const permissionCheck = await requirePermission(request, {
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

		const parsed = matchSchema.safeParse(body);
		if (!parsed.success) {
			return Response.json(
				{ error: "Invalid match payload", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const result = await matchAlertToRunbooks(org.orgId, parsed.data);
		return Response.json(result);
	}

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

	const parsed = createSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid runbook", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { item, storage } = await createRunbook(
		org.orgId,
		user.$id,
		parsed.data,
	);
	return Response.json({ item, storage }, { status: 201 });
}
