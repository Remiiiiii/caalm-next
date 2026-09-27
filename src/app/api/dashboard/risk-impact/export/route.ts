import { renderToStream } from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { RiskAvertedPdfDocument } from "@/lib/dashboard/risk-averted-pdf";
import { buildRiskAvertedPdfPayload } from "@/lib/dashboard/risk-impact-events";
import { computeRiskImpact } from "@/lib/dashboard/risk-impact.service";
import type { RiskImpactPeriod } from "@/lib/dashboard/risk-impact.types";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

const exportSchema = z.object({
	period: z.enum(["ytd", "last30", "last90"]).optional(),
	division: z.string().optional(),
});

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.VIEW,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		let orgId = getOrgIdFromRequest(request);
		if (!orgId) {
			const defaultOrg = await getUserDefaultOrganization(user.$id);
			orgId = defaultOrg?.orgId || "default_organization";
		}

		const body = await request.json().catch(() => ({}));
		const validated = exportSchema.parse(body);
		const period = (validated.period || "ytd") as RiskImpactPeriod;

		const [org, snapshot] = await Promise.all([
			getOrganization(orgId),
			computeRiskImpact({
				userId: user.$id,
				orgId,
				period,
				division: validated.division,
			}),
		]);

		const generatedAt = new Date().toLocaleString("en-US", {
			dateStyle: "medium",
			timeStyle: "short",
		});
		const payload = buildRiskAvertedPdfPayload({
			orgName: org?.name || "Organization",
			generatedAt,
			snapshot,
		});

		const documentElement = createElement(RiskAvertedPdfDocument, { payload });
		const pdfStream = await renderToStream(documentElement as never);
		const chunks: Buffer[] = [];
		for await (const chunk of pdfStream) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}

		const filename = `caalm-risk-averted-${period}-${new Date().toISOString().slice(0, 10)}.pdf`;
		return new NextResponse(Buffer.concat(chunks), {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		console.error("Error exporting risk averted PDF:", error);
		return NextResponse.json(
			{
				error: "Failed to create risk averted packet",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
