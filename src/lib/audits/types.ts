export type AuditControlDomain =
	| "regulatory"
	| "contracts"
	| "licenses"
	| "documents"
	| "governance";

export type AuditPeriod = "7d" | "30d" | "90d" | "ytd";

export type AuditEvidenceStatus =
	| "compliant"
	| "at_risk"
	| "non_compliant"
	| "pending"
	| "in_progress";

export type ComplianceRagStatus = "green" | "amber" | "red";

export interface AuditKpi {
	id: string;
	title: string;
	value: string;
	description: string;
	trend?: string;
	trendDirection?: "up" | "down" | "neutral";
	ragStatus?: ComplianceRagStatus;
}

export interface AuditTimeSeriesPoint {
	label: string;
	value: number;
	secondary?: number;
}

export interface AuditBreakdownPoint {
	name: string;
	value: number;
	fill?: string;
}

export interface AuditEvidenceRow {
	id: string;
	title: string;
	owner: string;
	status: AuditEvidenceStatus;
	dueDate: string;
	lastTested?: string;
	category?: string;
	moduleLink?: string;
	moduleLabel?: string;
}

export interface AuditDomainData {
	domain: AuditControlDomain;
	label: string;
	description: string;
	caalmModule: string;
	modulePath: string;
	kpis: AuditKpi[];
	timeSeries: Record<AuditPeriod, AuditTimeSeriesPoint[]>;
	breakdown: AuditBreakdownPoint[];
	donut: AuditBreakdownPoint[];
	evidence: AuditEvidenceRow[];
}

export interface ComplianceOverviewMetrics {
	ragStatus: ComplianceRagStatus;
	overallScore: number;
	areasAtRisk: number;
	upcomingDeadlines: number;
	filingsOnTime: number;
	contractComplianceRate: number | null;
	licenseRenewalHealth: number | null;
}

export interface LiveContractCompliance {
	total: number;
	complianceRate: number;
	buckets: Record<string, number>;
	expiringSoon: number;
	evidence: AuditEvidenceRow[];
}

export interface LiveLicenseCompliance {
	total: number;
	active: number;
	expiringSoon: number;
	atRisk: number;
	complianceBuckets: Record<string, number>;
	evidence: AuditEvidenceRow[];
}

export interface ComplianceStatusSnapshot {
	overview: ComplianceOverviewMetrics;
	contracts: LiveContractCompliance | null;
	licenses: LiveLicenseCompliance | null;
	sources: {
		contracts: boolean;
		licenses: boolean;
	};
}

export const AUDIT_CONTROL_TABS: Array<{
	id: AuditControlDomain;
	label: string;
	logDomain: AuditControlDomain;
}> = [
	{
		id: "regulatory",
		label: "Regulatory & filings",
		logDomain: "regulatory",
	},
	{
		id: "contracts",
		label: "Contracts & grants",
		logDomain: "contracts",
	},
	{
		id: "licenses",
		label: "Licenses",
		logDomain: "licenses",
	},
	{
		id: "documents",
		label: "Documents & evidence",
		logDomain: "documents",
	},
	{
		id: "governance",
		label: "Governance & teams",
		logDomain: "governance",
	},
];

export const AUDIT_PERIOD_OPTIONS: Array<{
	value: AuditPeriod;
	label: string;
}> = [
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "90d", label: "Last 90 days" },
	{ value: "ytd", label: "Year to date" },
];
