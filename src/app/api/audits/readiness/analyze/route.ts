import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	answerReadinessQuestion,
	generateReadinessAutoSummary,
} from "@/lib/audits/readiness/ai-summary";
import { buildOrgReadinessSummary } from "@/lib/audits/readiness/build-summary";
import { getOrgAuditSettings } from "@/lib/audits/readiness/org-settings";
import { crawlPublicSite } from "@/lib/audits/readiness/site-crawl";
import {
	listReadinessSnapshots,
	parseSnapshotPayload,
} from "@/lib/audits/readiness/snapshot.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

const schema = z.object({
	action: z.enum(["analyze", "question", "summary"]),
	question: z.string().max(2000).optional(),
	previousContext: z.string().max(8000).optional(),
	snapshotId: z.string().optional(),
});

async function loadPayload(orgId: string, snapshotId?: string) {
	const history = await listReadinessSnapshots({ orgId, limit: 12 });
	const row = snapshotId
		? history.find((item) => item.$id === snapshotId)
		: history[0];
	if (row) {
		const parsed = parseSnapshotPayload(row.payload);
		if (parsed) {
			return { payload: parsed, aiSummary: row.aiSummary || "" };
		}
	}

	const org = await getOrganization(orgId);
	const auditSettings = org
		? getOrgAuditSettings(org)
		: { timezone: "America/New_York", websiteUrl: null };
	const siteCrawl = auditSettings.websiteUrl
		? await crawlPublicSite(auditSettings.websiteUrl).catch(() => null)
		: null;
	const { summary, payloadBase } = await buildOrgReadinessSummary({
		orgId,
		siteCrawl,
	});
	return {
		payload: {
			...payloadBase,
			summary,
			previousScore: null,
			scoreDelta: null,
		},
		aiSummary: "",
	};
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const body = await request.json();
	const validated = schema.parse(body);
	const { payload, aiSummary } = await loadPayload(
		defaultOrg.orgId,
		validated.snapshotId,
	);

	if (validated.action === "summary" || validated.action === "analyze") {
		const summary =
			aiSummary || (await generateReadinessAutoSummary(payload));
		return NextResponse.json({
			success: true,
			data: {
				summary,
				keyPoints: payload.summary.insights.slice(0, 5).map((i) => i.title),
				suggestedQuestions: [
					"Which gaps matter most for HRSA OSV prep?",
					"What should we fix before child-welfare monitoring?",
					"Which items belong on a financial PBC list?",
					"What is scored vs informational on the public site crawl?",
				],
				documentType: "audit_readiness",
				topics: payload.sourcesUsed,
			},
		});
	}

	if (!validated.question?.trim()) {
		return NextResponse.json(
			{ error: "question is required" },
			{ status: 400 },
		);
	}

	const answer = await answerReadinessQuestion({
		payload,
		question: validated.question.trim(),
		previousContext: validated.previousContext,
	});

	return NextResponse.json({
		success: true,
		data: answer,
	});
}
