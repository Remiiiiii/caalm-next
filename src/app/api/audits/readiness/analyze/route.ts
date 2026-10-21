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
import {
	domainTileBadge,
	formatModuleBlurb,
	formatModuleHeadingName,
	formatPriorityAffects,
	formatPriorityDueLabel,
	formatPriorityInstruction,
	formatReadinessScopeLine,
	formatSourceLine,
	overallTileBadge,
} from "@/lib/audits/readiness/summary-tiles";
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

	const body = await request.json();
	const validated = schema.parse(body);
	const { payload, aiSummary } = await loadPayload(
		defaultOrg.orgId,
		validated.snapshotId,
	);

	// The model is given the first 8 insights; cite those records so answers can be checked.
	const citations = payload.summary.insights
		.slice(0, 8)
		.filter((insight) => insight.id !== "no-score")
		.map((insight) => ({
			id: insight.id,
			title: insight.itemTitle ?? insight.title,
			href: insight.moduleLink,
			label: insight.moduleLabel,
		}));

	if (validated.action === "summary" || validated.action === "analyze") {
		const summary = aiSummary || (await generateReadinessAutoSummary(payload));
		const suggestedQuestions = payload.summary.insights
			.slice(0, 4)
			.map((insight) => `What should we do about: ${insight.title}?`);

		// Pre-computed structured data from payload (no AI needed for stats)
		const domains = payload.summary.domains;
		const contractsDomain = domains.find((d) => d.domain === "contracts");
		const licensesDomain = domains.find((d) => d.domain === "licenses");
		const priorityInsight =
			payload.summary.insights.find(
				(i) =>
					(i.severity === "critical" || i.severity === "moderate") && i.dueDate,
			) ??
			payload.summary.insights.find((i) => i.severity === "critical") ??
			payload.summary.insights[0];

		const overallBadge = overallTileBadge(payload.summary.ragStatus);
		const contractsBadge = domainTileBadge(
			contractsDomain,
			payload.summary.insights,
		);
		const licensesBadge = domainTileBadge(
			licensesDomain,
			payload.summary.insights,
		);

		const structured = {
			overallScore: Math.round(payload.summary.readinessScore),
			overallRag: payload.summary.ragStatus,
			overallBadgeLabel: overallBadge.label,
			contractsGrantsScore: contractsDomain
				? Math.round(contractsDomain.readinessPercent)
				: null,
			contractsGrantsRag: contractsDomain?.ragStatus ?? null,
			contractsBadgeLabel: contractsBadge.label,
			licensesScore: licensesDomain
				? Math.round(licensesDomain.readinessPercent)
				: null,
			licensesRag: licensesDomain?.ragStatus ?? null,
			licensesBadgeLabel: licensesBadge.label,
			scopeLine: formatReadinessScopeLine({
				sourcesUsed: payload.sourcesUsed,
				expiringSoon: payload.summary.kpis.expiringSoon ?? 0,
				upcomingDeadlines: payload.summary.kpis.upcomingDeadlines ?? 0,
			}),
			priorityAction: priorityInsight
				? {
						title: priorityInsight.itemTitle ?? priorityInsight.title,
						dueDateLabel: formatPriorityDueLabel(
							priorityInsight.dueDate,
							priorityInsight.description,
						),
						instruction: formatPriorityInstruction({
							category: priorityInsight.category,
							itemKind: priorityInsight.itemKind,
							description: priorityInsight.description,
						}),
						affectsModules: formatPriorityAffects(
							priorityInsight.requirementTags,
							priorityInsight.itemKind,
						),
						moduleHref: priorityInsight.moduleLink,
					}
				: null,
			byModule: domains.map((d) => ({
				name: formatModuleHeadingName(d.label),
				score: Math.round(d.readinessPercent),
				ragStatus: d.ragStatus,
				atRiskCount: d.atRiskCount,
				evidenceCount: d.evidenceCount,
				modulePath: d.modulePath,
				blurb: formatModuleBlurb({
					domain: d.domain,
					atRiskCount: d.atRiskCount,
					upcomingDeadlines:
						d.domain === "contracts"
							? (payload.summary.kpis.upcomingDeadlines ?? 0)
							: 0,
				}),
			})),
			sourceLine: formatSourceLine(payload.sourcesUsed),
			publicSiteCrawl: payload.siteCrawl
				? {
						websiteUrl: payload.siteCrawl.websiteUrl,
						sitemapFound: payload.siteCrawl.sitemapFound,
						pagesCrawled: payload.siteCrawl.pages.length,
						healthHint: payload.siteCrawl.healthHint,
					}
				: null,
		};

		return NextResponse.json({
			success: true,
			data: {
				summary,
				structured,
				keyPoints: payload.summary.insights.slice(0, 5).map((i) => i.title),
				suggestedQuestions,
				documentType: "audit_readiness",
				topics: payload.sourcesUsed,
				citations,
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
		data: { ...answer, citations },
	});
}
