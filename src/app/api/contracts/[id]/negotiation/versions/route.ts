import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import {
	createVersion,
	listVersions,
} from "@/lib/contracts/negotiation/versions.service";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.VIEW,
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ error: "Organization is required" },
			{ status: 400 },
		);
	}
	const { id } = await context.params;
	try {
		await loadContractForOrg(id, orgId);
		const versions = await listVersions(id);
		return NextResponse.json({ versions });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to list versions";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	const orgId = getOrgIdFromRequest(request);
	if (!user || !orgId) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
	const { id } = await context.params;
	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	try {
		await loadContractForOrg(id, orgId);
		const version = await createVersion({
			contractId: id,
			orgId,
			extractedText: String(body.extractedText || ""),
			createdBy: user.$id,
			changeSummary: String(body.changeSummary || ""),
			source:
				body.source === "redline_accept" ? "redline_accept" : "manual_upload",
			fileId: typeof body.fileId === "string" ? body.fileId : "",
			bucketFileId:
				typeof body.bucketFileId === "string" ? body.bucketFileId : "",
		});
		return NextResponse.json({ version });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create version";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
