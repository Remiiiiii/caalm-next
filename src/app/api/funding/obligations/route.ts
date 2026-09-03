import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createObligation,
	isObligationKind,
	isObligationStatus,
	listObligations,
} from "@/lib/funding";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.FUNDING.VIEW,
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

	const contractId = request.nextUrl.searchParams.get("contractId") || undefined;
	const statusParam = request.nextUrl.searchParams.get("status");
	const status = isObligationStatus(statusParam) ? statusParam : undefined;

	try {
		const items = await listObligations({
			orgId: org.orgId,
			contractId,
			status,
		});
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[funding/obligations GET]", error);
		return NextResponse.json(
			{ error: "Failed to list obligations" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
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

	try {
		const body = await request.json();
		const title = String(body.title || "").trim();
		const contractId = String(body.contractId || "").trim();
		if (!title || !contractId) {
			return NextResponse.json(
				{ error: "title and contractId are required" },
				{ status: 400 },
			);
		}

		const obligation = await createObligation({
			orgId: org.orgId,
			contractId,
			contractName: body.contractName ? String(body.contractName) : undefined,
			title,
			description: body.description ? String(body.description) : undefined,
			kind: isObligationKind(body.kind) ? body.kind : "other",
			status: isObligationStatus(body.status) ? body.status : "open",
			ownerUserId: body.ownerUserId ? String(body.ownerUserId) : user.$id,
			ownerName: body.ownerName
				? String(body.ownerName)
				: user.fullName || user.name,
			dueDate: body.dueDate ? String(body.dueDate) : undefined,
			reminderDaysBefore:
				body.reminderDaysBefore != null
					? Number(body.reminderDaysBefore)
					: undefined,
			linkUrl: body.linkUrl ? String(body.linkUrl) : undefined,
			renewalLinked: Boolean(body.renewalLinked),
			createdByUserId: user.$id,
		});

		return NextResponse.json({ obligation }, { status: 201 });
	} catch (error) {
		console.error("[funding/obligations POST]", error);
		return NextResponse.json(
			{ error: "Failed to create obligation" },
			{ status: 500 },
		);
	}
}
