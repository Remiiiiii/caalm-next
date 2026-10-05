import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireITHubOrgContext } from "@/lib/it/require-it-hub-org";
import { getOrganization } from "@/lib/rbac/organizations";

export async function POST(request: NextRequest) {
	let bodyOrgId: string | undefined;
	try {
		const body = (await request.json()) as { orgId?: string };
		bodyOrgId = typeof body.orgId === "string" ? body.orgId.trim() : undefined;
	} catch {
		bodyOrgId = undefined;
	}

	const headers = new Headers(request.headers);
	if (bodyOrgId) {
		headers.set("x-org-id", bodyOrgId);
	}

	const scoped = new NextRequest(request.url, {
		method: "POST",
		headers,
	});

	const ctx = await requireITHubOrgContext(
		scoped,
		PERMISSIONS.IT.VIEW_MONITORING,
	);
	if (!ctx.ok) return ctx.response;

	const org = await getOrganization(ctx.orgId);
	return NextResponse.json({
		success: true,
		data: {
			orgId: ctx.orgId,
			name: org?.name || ctx.orgId,
			isPlatformCrossOrg: ctx.isPlatformCrossOrg,
		},
	});
}
