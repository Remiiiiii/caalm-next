export type AuditControlDomain =
	| "financial"
	| "documents"
	| "administrative"
	| "it"
	| "vendor";

export type AuditPeriod = "7d" | "30d" | "90d" | "ytd";

export type AuditEvidenceStatus =
	| "compliant"
	| "at_risk"
	| "non_compliant"
	| "pending"
	| "in_progress";

export interface AuditKpi {
	id: string;
	title: string;
	value: string;
	description: string;
	trend?: string;
	trendDirection?: "up" | "down" | "neutral";
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
}

export interface AuditDomainData {
	domain: AuditControlDomain;
	label: string;
	kpis: AuditKpi[];
	timeSeries: Record<AuditPeriod, AuditTimeSeriesPoint[]>;
	breakdown: AuditBreakdownPoint[];
	donut: AuditBreakdownPoint[];
	evidence: AuditEvidenceRow[];
}

export const AUDIT_CONTROL_TABS: Array<{
	id: AuditControlDomain;
	label: string;
	logDomain: AuditControlDomain;
}> = [
	{ id: "financial", label: "Financial statements", logDomain: "financial" },
	{
		id: "documents",
		label: "Supporting documents",
		logDomain: "documents",
	},
	{ id: "administrative", label: "Administrative", logDomain: "administrative" },
	{ id: "it", label: "IT access controls", logDomain: "it" },
	{ id: "vendor", label: "Vendor / RFP lifecycle", logDomain: "vendor" },
];

export const AUDIT_PERIOD_OPTIONS: Array<{ value: AuditPeriod; label: string }> =
	[
		{ value: "7d", label: "Last 7 days" },
		{ value: "30d", label: "Last 30 days" },
		{ value: "90d", label: "Last 90 days" },
		{ value: "ytd", label: "Year to date" },
	];
