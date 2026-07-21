import { PERMISSIONS } from "@/constants/permissions";
import { getComplianceStatusSnapshot } from "@/lib/audits/compliance-status.service";
import { mergeDomainWithLiveData } from "@/lib/audits/merge-live-data";
import type {
	AuditControlDomain,
	AuditEvidenceRow,
	AuditPeriod,
	ComplianceRagStatus,
} from "@/lib/audits/types";
import { AUDIT_CONTROL_TABS } from "@/lib/audits/types";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import { getAuditStats } from "@/lib/services/audit-logger";
import type {
	AuditReadinessCalendarSummary,
	AuditReadinessDepartment,
	AuditReadinessDomain,
	AuditReadinessInsight,
	AuditReadinessSeverity,
	AuditReadinessSummary,
} from "./audit-readiness.types";

function computeRag(score: number): ComplianceRagStatus {
	if (score >= 85) return "green";
	if (score >= 70) return "amber";
	return "red";
}

function parsePercent(value: string): number {
	const match = value.match(/(\d+)/);
	return match ? Number.parseInt(match[1], 10) : 0;
}

function buildDomainReadiness(
	domain: AuditControlDomain,
	snapshot: Awaited<ReturnType<typeof getComplianceStatusSnapshot>>,
): AuditReadinessDomain {
	const merged = mergeDomainWithLiveData(domain, snapshot);
	const tab = AUDIT_CONTROL_TABS.find((t) => t.id === domain);

	let readinessPercent = 88;
	let atRiskCount = 0;

	if (domain === "contracts" && snapshot.contracts) {
		readinessPercent = snapshot.contracts.complianceRate;
		atRiskCount =
			(snapshot.contracts.buckets["action-required"] ?? 0) +
			(snapshot.contracts.buckets["non-compliant"] ?? 0);
	} else if (domain === "licenses" && snapshot.licenses) {
		const total = snapshot.licenses.total;
		const compliant = snapshot.licenses.complianceBuckets.compliant ?? 0;
		readinessPercent = total > 0 ? Math.round((compliant / total) * 100) : 100;
		atRiskCount = snapshot.licenses.atRisk;
	} else {
		const primaryKpi = merged.kpis[0];
		if (primaryKpi) {
			readinessPercent = parsePercent(primaryKpi.value);
		}
		atRiskCount = merged.evidence.filter(
			(row) =>
				row.status === "at_risk" ||
				row.status === "non_compliant" ||
				row.status === "pending",
		).length;
	}

	return {
		domain,
		label: tab?.label ?? merged.label,
		readinessPercent,
		ragStatus: computeRag(readinessPercent),
		evidenceCount: merged.evidence.length,
		atRiskCount,
		modulePath: `/audits/status?tab=${domain}`,
	};
}

function buildSeverity(
	snapshot: Awaited<ReturnType<typeof getComplianceStatusSnapshot>>,
	calendar: AuditReadinessCalendarSummary | null,
): AuditReadinessSeverity {
	const critical =
		(snapshot.contracts?.buckets["non-compliant"] ?? 0) +
		(snapshot.licenses?.complianceBuckets["non-compliant"] ?? 0) +
		(calendar?.overdue ?? 0);

	const moderate =
		(snapshot.contracts?.buckets["action-required"] ?? 0) +
		(snapshot.licenses?.atRisk ?? 0) +
		(calendar?.atRisk ?? 0);

	const low =
		(snapshot.contracts?.buckets.unknown ?? 0) +
		Math.max(0, (snapshot.licenses?.expiringSoon ?? 0) - moderate);

	return { critical, moderate, low };
}

function buildInsights(
	evidenceGaps: AuditEvidenceRow[],
	snapshot: Awaited<ReturnType<typeof getComplianceStatusSnapshot>>,
	calendar: AuditReadinessCalendarSummary | null,
): AuditReadinessInsight[] {
	const insights: AuditReadinessInsight[] = [];

	for (const row of evidenceGaps.slice(0, 8)) {
		insights.push({
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
		});
	}

	if ((calendar?.overdue ?? 0) > 0) {
		insights.push({
			id: "calendar-overdue",
			title: `${calendar!.overdue} overdue compliance deadlines`,
			description:
				"Calendar deadlines need immediate attention before audit review.",
			severity: "critical",
			moduleLink: "/calendar",
			moduleLabel: "Calendar",
		});
	}

	if ((snapshot.overview.areasAtRisk ?? 0) > 0 && insights.length < 8) {
		insights.push({
			id: "areas-at-risk",
			title: `${snapshot.overview.areasAtRisk} areas at risk`,
			description: "Review contracts and licenses flagged for follow-up.",
			severity: "moderate",
			moduleLink: "/audits/status",
			moduleLabel: "Compliance",
		});
	}

	return insights.slice(0, 8);
}

function collectEvidenceGaps(
	snapshot: Awaited<ReturnType<typeof getComplianceStatusSnapshot>>,
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

function buildComplianceTrend(
	rate: number,
	period: AuditPeriod,
): Array<{ label: string; value: number }> {
	const labels =
		period === "7d"
			? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
			: period === "30d"
				? ["W1", "W2", "W3", "W4"]
				: period === "90d"
					? ["M1", "M2", "M3"]
					: ["Q1", "Q2", "Q3", "Q4"];

	return labels.map((label, index) => ({
		label,
		value: Math.max(0, Math.min(100, rate - (labels.length - index - 1) * 2)),
	}));
}

export async function buildAuditReadinessSummary(
	userId: string,
	period: AuditPeriod = "30d",
	departments: AuditReadinessDepartment[] = [],
	unifiedTotals?: {
		totalContracts: number;
		totalBudget: number;
		overallComplianceRate: number;
	},
	calendar: AuditReadinessCalendarSummary | null = null,
): Promise<AuditReadinessSummary> {
	const defaultOrg = await getUserDefaultOrganization(userId);
	const permissions = await getUserPermissions(userId, defaultOrg?.orgId);

	const snapshot = await getComplianceStatusSnapshot(userId);
	const evidenceGaps = collectEvidenceGaps(snapshot);

	const canViewAudit = permissions.includes(PERMISSIONS.AUDIT.VIEW);
	const canExportAudit = permissions.includes(PERMISSIONS.AUDIT.EXPORT);

	const severity = buildSeverity(snapshot, calendar);
	const domains = AUDIT_CONTROL_TABS.map((tab) =>
		buildDomainReadiness(tab.id, snapshot),
	);
	const insights = buildInsights(evidenceGaps, snapshot, calendar);

	let auditActivity: AuditReadinessSummary["auditActivity"] = null;
	if (canViewAudit) {
		try {
			const stats = await getAuditStats();
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			const eventsLast7d = stats.eventsByDate
				.filter((entry) => new Date(entry.date) >= sevenDaysAgo)
				.reduce((sum, entry) => sum + entry.count, 0);

			auditActivity = {
				totalEvents: stats.totalEvents,
				failedActions: stats.failedActions,
				successRate: Math.round(stats.successRate),
				eventsLast7d,
				canView: true,
				canExport: canExportAudit,
			};
		} catch {
			auditActivity = {
				totalEvents: 0,
				failedActions: 0,
				successRate: 0,
				eventsLast7d: 0,
				canView: true,
				canExport: canExportAudit,
			};
		}
	}

	const totalContracts =
		unifiedTotals?.totalContracts ?? snapshot.contracts?.total ?? 0;
	const totalBudget = unifiedTotals?.totalBudget ?? 0;
	const overallComplianceRate =
		unifiedTotals?.overallComplianceRate ??
		snapshot.overview.contractComplianceRate ??
		snapshot.overview.overallScore;

	const expiringSoon =
		(snapshot.contracts?.expiringSoon ?? 0) +
		(snapshot.licenses?.expiringSoon ?? 0);

	return {
		lastUpdated: new Date().toISOString(),
		period,
		readinessScore: snapshot.overview.overallScore,
		ragStatus: snapshot.overview.ragStatus,
		complianceSnapshot: snapshot,
		kpis: {
			totalContracts,
			totalBudget,
			overallComplianceRate,
			licensesAtRisk: snapshot.licenses?.atRisk ?? 0,
			expiringSoon,
			evidenceGaps: evidenceGaps.length,
			upcomingDeadlines: snapshot.overview.upcomingDeadlines,
		},
		severity,
		domains,
		insights,
		evidenceGaps: evidenceGaps.slice(0, 15),
		departments,
		calendar,
		auditActivity,
		trends: {
			compliance: buildComplianceTrend(overallComplianceRate, period),
			auditActivity:
				auditActivity?.canView && auditActivity.eventsLast7d > 0
					? buildComplianceTrend(
							Math.min(100, auditActivity.eventsLast7d * 5),
							period,
						)
					: buildComplianceTrend(0, period),
		},
	};
}

export function mapDepartmentsFromUnified(
	departments: Array<{
		name: string;
		totalStats?: {
			totalContracts?: number;
			totalBudget?: number;
			complianceRate?: number;
		};
	}>,
): AuditReadinessDepartment[] {
	return departments.map((dept) => {
		const rate = dept.totalStats?.complianceRate ?? 0;
		return {
			name: dept.name,
			totalContracts: dept.totalStats?.totalContracts ?? 0,
			totalBudget: dept.totalStats?.totalBudget ?? 0,
			complianceRate: rate,
			ragStatus: computeRag(rate),
		};
	});
}
