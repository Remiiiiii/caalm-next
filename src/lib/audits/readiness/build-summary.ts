import type {
	AuditReadinessInsight,
	AuditReadinessSummary,
} from "@/lib/analytics/audit-readiness.types";
import { AUDIT_CONTROL_TABS } from "@/lib/audits/types";
import type { AuditEvidenceRow, AuditPeriod } from "@/lib/audits/types";
import { listEvidenceMap } from "./evidence-map.service";
import { getOrgComplianceSnapshot } from "./org-compliance";
import { computeRag } from "./score";
import type {
	AuditEvidenceAuditType,
	AuditReadinessSnapshotPayload,
	SiteCrawlResult,
} from "./types";
import { READINESS_DISCLAIMER } from "./types";

function collectEvidenceGaps(
	snapshot: Awaited<ReturnType<typeof getOrgComplianceSnapshot>>,
): AuditEvidenceRow[] {
	const rows: AuditEvidenceRow[] = [];
	if (snapshot.contracts?.evidence) rows.push(...snapshot.contracts.evidence);
	if (snapshot.licenses?.evidence) rows.push(...snapshot.licenses.evidence);
	const priority: Record<string, number> = {
		non_compliant: 0,
		at_risk: 1,
		pending: 2,
		in_progress: 3,
		compliant: 4,
	};
	return rows.sort(
		(a, b) => (priority[a.status] ?? 5) - (priority[b.status] ?? 5),
	);
}

function tagInsights(
	insights: AuditReadinessInsight[],
	moduleToTypes: Map<string, AuditEvidenceAuditType[]>,
): AuditReadinessInsight[] {
	return insights.map((insight) => {
		const moduleKey = insight.moduleLink.includes("license")
			? "licenses"
			: insight.moduleLink.includes("contract")
				? "contracts"
				: "other";
		const tags = moduleToTypes.get(moduleKey) ?? [];
		return {
			...insight,
			description: tags.length
				? `${insight.description} · [${tags.join(", ")}]`
				: insight.description,
		};
	});
}

export async function buildOrgReadinessSummary(options: {
	orgId: string;
	period?: AuditPeriod;
	siteCrawl?: SiteCrawlResult | null;
	historyScores?: Array<{ label: string; value: number }>;
}): Promise<{
	summary: AuditReadinessSummary;
	payloadBase: Omit<
		AuditReadinessSnapshotPayload,
		"previousScore" | "scoreDelta"
	>;
}> {
	const snapshot = await getOrgComplianceSnapshot(options.orgId);
	const evidenceGaps = collectEvidenceGaps(snapshot);
	const mapRows = await listEvidenceMap("cfce_fqhc_cw", true);

	const moduleToTypes = new Map<string, AuditEvidenceAuditType[]>();
	for (const row of mapRows) {
		const list = moduleToTypes.get(row.caalmModule) ?? [];
		if (!list.includes(row.auditType)) list.push(row.auditType);
		moduleToTypes.set(row.caalmModule, list);
	}

	const severity = {
		critical:
			(snapshot.contracts?.buckets["non-compliant"] ?? 0) +
			(snapshot.licenses?.complianceBuckets["non-compliant"] ?? 0),
		moderate:
			(snapshot.contracts?.buckets["action-required"] ?? 0) +
			(snapshot.licenses?.atRisk ?? 0),
		low: Math.max(0, (snapshot.licenses?.expiringSoon ?? 0)),
	};

	const insights: AuditReadinessInsight[] = evidenceGaps.slice(0, 8).map((row) => ({
		id: row.id,
		title: row.title,
		description: `${row.category ?? "Evidence"} · ${row.owner} · due ${row.dueDate}`,
		severity:
			row.status === "non_compliant"
				? "critical"
				: row.status === "at_risk"
					? "moderate"
					: "low",
		moduleLink: row.moduleLink ?? "/audits/status",
		moduleLabel: row.moduleLabel ?? "Audits",
	}));

	if (snapshot.liveScore === null) {
		insights.unshift({
			id: "no-score",
			title: "Add contracts or licenses to generate a readiness score",
			description:
				"CAALM readiness needs live Contracts and/or Licenses data in this organization.",
			severity: "moderate",
			moduleLink: "/contracts",
			moduleLabel: "Contracts",
		});
	}

	const domains = AUDIT_CONTROL_TABS.filter((tab) =>
		["contracts", "licenses"].includes(tab.id),
	).map((tab) => {
		if (tab.id === "contracts" && snapshot.contracts) {
			return {
				domain: tab.id,
				label: tab.label,
				readinessPercent: snapshot.contracts.complianceRate,
				ragStatus: computeRag(snapshot.contracts.complianceRate) ?? "red",
				evidenceCount: snapshot.contracts.evidence.length,
				atRiskCount:
					(snapshot.contracts.buckets["action-required"] ?? 0) +
					(snapshot.contracts.buckets["non-compliant"] ?? 0),
				modulePath: `/audits/status?tab=${tab.id}`,
			};
		}
		if (tab.id === "licenses" && snapshot.licenses) {
			const total = snapshot.licenses.total;
			const compliant = snapshot.licenses.complianceBuckets.compliant ?? 0;
			const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;
			return {
				domain: tab.id,
				label: tab.label,
				readinessPercent: pct,
				ragStatus: computeRag(pct) ?? "red",
				evidenceCount: snapshot.licenses.evidence.length,
				atRiskCount: snapshot.licenses.atRisk,
				modulePath: `/audits/status?tab=${tab.id}`,
			};
		}
		return {
			domain: tab.id,
			label: tab.label,
			readinessPercent: 0,
			ragStatus: "red" as const,
			evidenceCount: 0,
			atRiskCount: 0,
			modulePath: `/audits/status?tab=${tab.id}`,
		};
	});

	const score = snapshot.liveScore;
	const summary: AuditReadinessSummary = {
		lastUpdated: new Date().toISOString(),
		period: options.period ?? "30d",
		readinessScore: score ?? 0,
		ragStatus: computeRag(score) ?? "red",
		complianceSnapshot: snapshot,
		kpis: {
			totalContracts: snapshot.contracts?.total ?? 0,
			totalBudget: 0,
			overallComplianceRate: score ?? 0,
			licensesAtRisk: snapshot.licenses?.atRisk ?? 0,
			expiringSoon:
				(snapshot.contracts?.expiringSoon ?? 0) +
				(snapshot.licenses?.expiringSoon ?? 0),
			evidenceGaps: evidenceGaps.length,
			upcomingDeadlines: snapshot.overview.upcomingDeadlines,
		},
		severity,
		domains,
		insights: tagInsights(insights, moduleToTypes).slice(0, 8),
		evidenceGaps: evidenceGaps.slice(0, 15),
		departments: [],
		calendar: null,
		auditActivity: null,
		trends: {
			compliance:
				options.historyScores && options.historyScores.length > 0
					? options.historyScores
					: score !== null
						? [{ label: "Now", value: score }]
						: [],
			auditActivity: [],
		},
	};

	const evidenceMapHits = mapRows
		.filter((row) => row.caalmModule === "contracts" || row.caalmModule === "licenses" || row.caalmModule === "site")
		.map((row) => ({
			requirementId: row.requirementId,
			label: row.label,
			auditType: row.auditType,
			caalmModule: row.caalmModule,
		}));

	return {
		summary,
		payloadBase: {
			summary,
			siteCrawl: options.siteCrawl ?? null,
			evidenceMapHits,
			sourcesUsed: snapshot.sourcesUsed,
			disclaimer: READINESS_DISCLAIMER,
		},
	};
}
