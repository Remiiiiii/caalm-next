import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createEnvelope } from "@/lib/esign/envelope-service";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import type { EsignResourceType } from "@/lib/esign/types";

export async function POST(request: NextRequest) {
	const body = (await request.json()) as {
		resourceType?: EsignResourceType;
		resourceId?: string;
		documentFileId?: string;
		title?: string;
		recipients?: Array<{ email: string; name: string; role?: "signer" | "cc" }>;
		fields?: unknown[];
		expiresAt?: string;
		emailSubject?: string;
		emailMessage?: string;
	};

	const resourceType = body.resourceType === "license" ? "license" : "contract";
	const permission =
		resourceType === "license"
			? PERMISSIONS.LICENSES.SIGN
			: PERMISSIONS.CONTRACTS.SIGN;

	const denied = await requirePermission(request, { permission });
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	if (!body.resourceId || !body.recipients?.length) {
		return NextResponse.json(
			{ error: "resourceId and at least one recipient are required" },
			{ status: 400 },
		);
	}

	const org =
		getOrgIdFromRequest(request) ||
		(await getUserDefaultOrganization(user.$id))?.orgId;
	if (!org) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	try {
		const envelope = await createEnvelope({
			orgId: org,
			resourceType,
			resourceId: body.resourceId,
			documentFileId: body.documentFileId || "",
			createdBy: user.$id,
			title: body.title,
			recipients: body.recipients,
			fields: body.fields as never,
			expiresAt: body.expiresAt,
			emailSubject: body.emailSubject,
			emailMessage: body.emailMessage,
		});
		return NextResponse.json({ envelope });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Create failed";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
