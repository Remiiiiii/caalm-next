import type {
	AuditControlDomain,
	AuditEvidenceRow,
	AuditPeriod,
	ComplianceRagStatus,
	ComplianceStatusSnapshot,
} from "@/lib/audits/types";

export interface AuditReadinessSeverity {
	critical: number;
	moderate: number;
	low: number;
}

export interface AuditReadinessInsight {
	id: string;
	title: string;
	description: string;
	severity: "critical" | "moderate" | "low";
	moduleLink: string;
	moduleLabel: string;
	/** Structured fields so the UI never has to parse `description`. */
	itemTitle?: string;
	/** "contract" | "license" | "other" */
	itemKind?: string;
	/** Evidence category, e.g. "Action required". */
	category?: string;
	owner?: string;
	/** ISO date or date-time string. */
	dueDate?: string;
	/** Audit types this item counts toward: hrsa_osv, cw_monitoring, financial_pbc. */
	requirementTags?: string[];
	/** True for a missing-evidence gap (vs. a record that needs action). */
	isEvidenceGap?: boolean;
}

export interface AuditReadinessDomain {
	domain: AuditControlDomain;
	label: string;
	readinessPercent: number;
	ragStatus: ComplianceRagStatus;
	evidenceCount: number;
	atRiskCount: number;
	modulePath: string;
}

export interface AuditReadinessDepartment {
	name: string;
	totalContracts: number;
	totalBudget: number;
	complianceRate: number;
	ragStatus: ComplianceRagStatus;
}

export interface AuditReadinessCalendarSummary {
	complianceRate: number | null;
	atRisk: number;
	overdue: number;
}

export interface AuditReadinessAuditActivity {
	totalEvents: number;
	failedActions: number;
	successRate: number;
	eventsLast7d: number;
	canView: boolean;
	canExport: boolean;
}

export interface AuditReadinessSummary {
	lastUpdated: string;
	period: AuditPeriod;
	readinessScore: number;
	ragStatus: ComplianceRagStatus;
	complianceSnapshot: ComplianceStatusSnapshot;
	kpis: {
		totalContracts: number;
		totalBudget: number;
		overallComplianceRate: number;
		licensesAtRisk: number;
		expiringSoon: number;
		evidenceGaps: number;
		upcomingDeadlines: number;
	};
	severity: AuditReadinessSeverity;
	domains: AuditReadinessDomain[];
	insights: AuditReadinessInsight[];
	evidenceGaps: AuditEvidenceRow[];
	departments: AuditReadinessDepartment[];
	calendar: AuditReadinessCalendarSummary | null;
	auditActivity: AuditReadinessAuditActivity | null;
	trends: {
		compliance: Array<{ label: string; value: number }>;
		auditActivity: Array<{ label: string; value: number }>;
	};
}
