import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { buildNegotiationPreview } from "@/lib/contracts/negotiation/preview-pdf.service";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
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
		const preview = await buildNegotiationPreview({
			contractId: id,
			orgId,
		});
		if (preview.kind === "pdf") {
			return new NextResponse(new Uint8Array(preview.buffer), {
				headers: {
					"Cache-Control": "no-store",
					"Content-Disposition": 'inline; filename="negotiation-preview.pdf"',
					"Content-Type": "application/pdf",
					"X-Negotiation-Preview-Mode": "pdf",
				},
			});
		}
		return NextResponse.json(
			{ mode: "html", html: preview.html },
			{
				headers: {
					"Cache-Control": "no-store",
					"X-Negotiation-Preview-Mode": "html",
				},
			},
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to build PDF preview";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
