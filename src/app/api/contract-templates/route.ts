import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createTemplate,
	isTemplateStatus,
	isValidContractTypeId,
	listTemplates,
} from "@/lib/contract-templates/contract-templates.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import type { ClauseRef } from "@/types/contract-templates";

function parseRefs(raw: unknown): ClauseRef[] | null {
	if (!Array.isArray(raw)) return null;
	const refs: ClauseRef[] = [];
	for (const [index, item] of raw.entries()) {
		if (!item || typeof item !== "object") return null;
		const familyId = String(
			(item as { familyId?: unknown }).familyId || "",
		).trim();
		if (!familyId) return null;
		const sortOrderRaw = (item as { sortOrder?: unknown }).sortOrder;
		const sortOrder =
			typeof sortOrderRaw === "number" ? sortOrderRaw : index;
		refs.push({ familyId, sortOrder });
	}
	return refs;
}

export async function GET(request: NextRequest) {
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

	const { searchParams } = request.nextUrl;
	const statusParam = searchParams.get("status");
	const familyId = searchParams.get("familyId") || undefined;

	try {
		const items = await listTemplates({
			orgId: org.orgId,
			status: isTemplateStatus(statusParam) ? statusParam : undefined,
			search: searchParams.get("search") || undefined,
		});
		const filtered = familyId
			? items.filter((item) =>
					item.clauseRefs.some((ref) => ref.familyId === familyId),
				)
			: items;
		return NextResponse.json({ items: filtered });
	} catch (error) {
		console.error("[contract-templates GET]", error);
		return NextResponse.json(
			{ error: "Failed to list templates" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACT_TEMPLATES.CREATE,
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
		const refs = parseRefs(body.clauseRefs);
		if (!title) {
			return NextResponse.json({ error: "title is required" }, { status: 400 });
		}
		if (!refs) {
			return NextResponse.json(
				{ error: "clauseRefs must be an array" },
				{ status: 400 },
			);
		}
		if (!isValidContractTypeId(body.contractTypeId)) {
			return NextResponse.json(
				{ error: "Invalid contract type" },
				{ status: 400 },
			);
		}

		const template = await createTemplate({
			orgId: org.orgId,
			userId: user.$id,
			data: {
				title,
				description: body.description ? String(body.description) : undefined,
				status: isTemplateStatus(body.status) ? body.status : "draft",
				contractTypeId: body.contractTypeId,
				clauseRefs: refs,
			},
		});
		return NextResponse.json({ template }, { status: 201 });
	} catch (error) {
		console.error("[contract-templates POST]", error);
		const message =
			error instanceof Error ? error.message : "Failed to create template";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
