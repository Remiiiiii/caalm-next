import { type NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { generateReadinessAutoSummary } from "@/lib/audits/readiness/ai-summary";
import { buildOrgReadinessSummary } from "@/lib/audits/readiness/build-summary";
import { getOrgAuditSettings } from "@/lib/audits/readiness/org-settings";
import { AuditReadinessPdfDocument } from "@/lib/audits/readiness/pdf-document";
import { computeRag } from "@/lib/audits/readiness/score";
import { crawlPublicSite } from "@/lib/audits/readiness/site-crawl";
import {
	listReadinessSnapshots,
	parseSnapshotPayload,
} from "@/lib/audits/readiness/snapshot.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

const exportSchema = z.object({
	snapshotId: z.string().optional(),
	cadence: z.enum(["weekly", "monthly", "quarterly"]).optional(),
});

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.EXPORT,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const org = await getOrganization(defaultOrg.orgId);
	const body = await request.json().catch(() => ({}));
	const validated = exportSchema.parse(body);

	const history = await listReadinessSnapshots({
		orgId: defaultOrg.orgId,
		cadence: validated.cadence,
		limit: 20,
	});

	let payload = validated.snapshotId
		? parseSnapshotPayload(
				history.find((row) => row.$id === validated.snapshotId)?.payload || "",
			)
		: parseSnapshotPayload(history[0]?.payload || "");

	let aiSummary =
		history.find((row) => row.$id === validated.snapshotId)?.aiSummary ||
		history[0]?.aiSummary ||
		"";

	if (!payload) {
		const auditSettings = org
			? getOrgAuditSettings(org)
			: { timezone: "America/New_York", websiteUrl: null };
		const siteCrawl = auditSettings.websiteUrl
			? await crawlPublicSite(auditSettings.websiteUrl).catch(() => null)
			: null;
		const { summary, payloadBase } = await buildOrgReadinessSummary({
			orgId: defaultOrg.orgId,
			siteCrawl,
			historyScores: history
				.filter((row) => row.score !== null)
				.reverse()
				.map((row, index) => ({
					label: `R${index + 1}`,
					value: row.score as number,
				})),
		});
		payload = {
			...payloadBase,
			summary: {
				...summary,
				ragStatus:
					computeRag(
						payloadBase.sourcesUsed.length ? summary.readinessScore : null,
					) ?? summary.ragStatus,
			},
			previousScore: history[0]?.score ?? null,
			scoreDelta: null,
		};
		aiSummary = await generateReadinessAutoSummary(payload);
	}

	const cadence =
		validated.cadence ||
		history.find((row) => row.$id === validated.snapshotId)?.cadence ||
		history[0]?.cadence ||
		"weekly";

	const documentElement = createElement(AuditReadinessPdfDocument, {
		orgName: org?.name || "Organization",
		cadence,
		generatedAt: new Date().toLocaleString("en-US", {
			timeZone: org ? getOrgAuditSettings(org).timezone : "UTC",
		}),
		payload,
		aiSummary,
	});

	const pdfStream = await renderToStream(documentElement as never);
	const chunks: Buffer[] = [];
	for await (const chunk of pdfStream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	const buffer = Buffer.concat(chunks);

	const filename = `caalm-readiness-${cadence}-${new Date().toISOString().slice(0, 10)}.pdf`;
	return new NextResponse(buffer, {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Cache-Control": "no-store",
		},
	});
}
