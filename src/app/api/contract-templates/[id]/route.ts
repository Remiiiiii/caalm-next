import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	archiveTemplate,
	getTemplateById,
	isTemplateStatus,
	isValidContractTypeId,
	updateTemplate,
} from "@/lib/contract-templates/contract-templates.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import type { ClauseRef } from "@/types/contract-templates";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedTemplate(id: string, orgId: string) {
	const existing = await getTemplateById(id);
	if (!existing || existing.orgId !== orgId) {
		return null;
	}
	return existing;
}

function parseRefs(raw: unknown): ClauseRef[] | undefined {
	if (raw == null) return undefined;
	if (!Array.isArray(raw)) return undefined;
	const refs: ClauseRef[] = [];
	for (const [index, item] of raw.entries()) {
		if (!item || typeof item !== "object") return undefined;
		const familyId = String(
			(item as { familyId?: unknown }).familyId || "",
		).trim();
		if (!familyId) return undefined;
		const sortOrderRaw = (item as { sortOrder?: unknown }).sortOrder;
		const sortOrder =
			typeof sortOrderRaw === "number" ? sortOrderRaw : index;
		refs.push({ familyId, sortOrder });
	}
	return refs;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACT_TEMPLATES.VIEW,
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
	const template = await loadOwnedTemplate(id, org.orgId);
	if (!template) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}
	return NextResponse.json({ template });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACT_TEMPLATES.EDIT,
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
	const existing = await loadOwnedTemplate(id, org.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const refs = parseRefs(body.clauseRefs);
		if (body.clauseRefs != null && refs == null) {
			return NextResponse.json(
				{ error: "clauseRefs must be an array" },
				{ status: 400 },
			);
		}
		if (
			body.contractTypeId != null &&
			!isValidContractTypeId(body.contractTypeId)
		) {
			return NextResponse.json(
				{ error: "Invalid contract type" },
				{ status: 400 },
			);
		}

		const template = await updateTemplate({
			template: existing,
			userId: user.$id,
			data: {
				title: body.title != null ? String(body.title) : undefined,
				description:
					body.description != null ? String(body.description) : undefined,
				status: isTemplateStatus(body.status) ? body.status : undefined,
				contractTypeId: isValidContractTypeId(body.contractTypeId)
					? body.contractTypeId
					: undefined,
				clauseRefs: refs,
			},
		});
		return NextResponse.json({ template });
	} catch (error) {
		console.error("[contract-templates PATCH]", error);
		const message =
			error instanceof Error ? error.message : "Failed to update template";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACT_TEMPLATES.DELETE,
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
	const existing = await loadOwnedTemplate(id, org.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Template not found" }, { status: 404 });
	}

	try {
		const template = await archiveTemplate({
			template: existing,
			userId: user.$id,
		});
		return NextResponse.json({ template });
	} catch (error) {
		console.error("[contract-templates DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to archive template" },
			{ status: 500 },
		);
	}
}
