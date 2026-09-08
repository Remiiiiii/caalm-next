import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { diffParagraphs } from "@/lib/contracts/negotiation/diff.service";
import {
	getVersion,
	listVersions,
} from "@/lib/contracts/negotiation/versions.service";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

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
	const { id, versionId } = await context.params;
	const against = request.nextUrl.searchParams.get("against") || "";
	try {
		await loadContractForOrg(id, orgId);
		const current = await getVersion(versionId);
		if (!current || current.contractId !== id) {
			return NextResponse.json({ error: "Version not found" }, { status: 404 });
		}
		let other = against ? await getVersion(against) : null;
		if (!other) {
			const versions = await listVersions(id);
			other = versions.find((row) => row.$id !== current.$id) || current;
		}
		const rows = diffParagraphs(other.extractedText, current.extractedText);
		return NextResponse.json({
			left: other,
			right: current,
			rows,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to diff versions";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
