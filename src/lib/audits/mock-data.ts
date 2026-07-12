import type { AuditDomainData, AuditPeriod } from "./types";

function series(
	labels: string[],
	values: number[],
	secondary?: number[],
): Record<AuditPeriod, { label: string; value: number; secondary?: number }[]> {
	const points = labels.map((label, i) => ({
		label,
		value: values[i] ?? 0,
		secondary: secondary?.[i],
	}));
	return {
		"7d": points.slice(-7),
		"30d": points.slice(-10),
		"90d": points,
		ytd: points,
	};
}

export const USE_AUDIT_MOCK_DATA =
	process.env.NEXT_PUBLIC_AUDIT_MOCK_DATA !== "false";

export const auditDomainMockData: Record<
	AuditDomainData["domain"],
	AuditDomainData
> = {
	financial: {
		domain: "financial",
		label: "Financial statements",
		kpis: [
			{
				id: "tested",
				title: "Controls tested",
				value: "84",
				description: "This period",
				trend: "+12%",
				trendDirection: "up",
			},
			{
				id: "exceptions",
				title: "Open exceptions",
				value: "6",
				description: "Needs remediation",
				trend: "-2",
				trendDirection: "down",
			},
			{
				id: "sox",
				title: "SOX readiness",
				value: "91%",
				description: "Key controls passing",
				trend: "+4%",
				trendDirection: "up",
			},
			{
				id: "close",
				title: "Days to close",
				value: "5",
				description: "Month-end estimate",
				trend: "-1 day",
				trendDirection: "down",
			},
		],
		timeSeries: series(
			["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
			[62, 68, 71, 74, 78, 80, 82, 83, 84, 86],
			[4, 5, 6, 5, 7, 6, 5, 6, 6, 5],
		),
		breakdown: [
			{ name: "Revenue", value: 18, fill: "#0f5384" },
			{ name: "Expenses", value: 14, fill: "#03AFBF" },
			{ name: "Payroll", value: 11, fill: "#56B8FF" },
			{ name: "Cash", value: 9, fill: "#1E40AF" },
		],
		donut: [
			{ name: "Operating", value: 42, fill: "#0f5384" },
			{ name: "Disclosure", value: 28, fill: "#03AFBF" },
			{ name: "Existence", value: 18, fill: "#56B8FF" },
			{ name: "Completeness", value: 12, fill: "#1E40AF" },
		],
		evidence: [
			{
				id: "FIN-001",
				title: "Bank reconciliation review",
				owner: "A. Morgan",
				status: "compliant",
				dueDate: "2026-07-15",
				lastTested: "2026-07-10",
			},
			{
				id: "FIN-002",
				title: "Journal entry approval workflow",
				owner: "J. Patel",
				status: "at_risk",
				dueDate: "2026-07-18",
				lastTested: "2026-07-05",
			},
			{
				id: "FIN-003",
				title: "Revenue cutoff testing",
				owner: "S. Chen",
				status: "pending",
				dueDate: "2026-07-22",
			},
		],
	},
	documents: {
		domain: "documents",
		label: "Supporting documents",
		kpis: [
			{
				id: "collected",
				title: "Docs collected",
				value: "312",
				description: "Evidence on file",
				trend: "+28",
				trendDirection: "up",
			},
			{
				id: "missing",
				title: "Missing evidence",
				value: "14",
				description: "Outstanding requests",
				trend: "-3",
				trendDirection: "down",
			},
			{
				id: "overdue",
				title: "Overdue uploads",
				value: "5",
				description: "Past due date",
				trend: "+1",
				trendDirection: "up",
			},
			{
				id: "complete",
				title: "Completeness",
				value: "94%",
				description: "Required docs received",
				trend: "+2%",
				trendDirection: "up",
			},
		],
		timeSeries: series(
			["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
			[180, 195, 210, 228, 245, 260, 275, 290, 302, 312],
			[22, 20, 18, 17, 16, 15, 14, 14, 13, 14],
		),
		breakdown: [
			{ name: "Contracts", value: 98, fill: "#0f5384" },
			{ name: "Invoices", value: 76, fill: "#03AFBF" },
			{ name: "Policies", value: 54, fill: "#56B8FF" },
			{ name: "Board mins", value: 42, fill: "#1E40AF" },
		],
		donut: [
			{ name: "Complete", value: 94, fill: "#03AFBF" },
			{ name: "In review", value: 4, fill: "#56B8FF" },
			{ name: "Missing", value: 2, fill: "#EF4444" },
		],
		evidence: [
			{
				id: "DOC-101",
				title: "Q2 board meeting minutes",
				owner: "L. Brooks",
				status: "compliant",
				dueDate: "2026-07-12",
				lastTested: "2026-07-11",
			},
			{
				id: "DOC-102",
				title: "Vendor W-9 collection",
				owner: "R. Kim",
				status: "at_risk",
				dueDate: "2026-07-14",
			},
			{
				id: "DOC-103",
				title: "Insurance certificate renewal",
				owner: "M. Ortiz",
				status: "non_compliant",
				dueDate: "2026-07-08",
			},
		],
	},
	administrative: {
		domain: "administrative",
		label: "Administrative",
		kpis: [
			{
				id: "policies",
				title: "Policies reviewed",
				value: "38",
				description: "Current cycle",
				trend: "+6",
				trendDirection: "up",
			},
			{
				id: "training",
				title: "Training completion",
				value: "87%",
				description: "Staff certified",
				trend: "+5%",
				trendDirection: "up",
			},
			{
				id: "actions",
				title: "Open action items",
				value: "11",
				description: "From last review",
				trend: "-4",
				trendDirection: "down",
			},
			{
				id: "findings",
				title: "Audit findings",
				value: "3",
				description: "Open findings",
				trend: "0",
				trendDirection: "neutral",
			},
		],
		timeSeries: series(
			["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
			[8, 9, 10, 9, 11, 10, 9, 8, 7, 6],
			[72, 74, 76, 78, 80, 82, 84, 85, 86, 87],
		),
		breakdown: [
			{ name: "HR", value: 12, fill: "#0f5384" },
			{ name: "Governance", value: 9, fill: "#03AFBF" },
			{ name: "Procurement", value: 7, fill: "#56B8FF" },
			{ name: "Facilities", value: 5, fill: "#1E40AF" },
		],
		donut: [
			{ name: "Compliant", value: 78, fill: "#03AFBF" },
			{ name: "At risk", value: 14, fill: "#F59E0B" },
			{ name: "Non-compliant", value: 8, fill: "#EF4444" },
		],
		evidence: [
			{
				id: "ADM-201",
				title: "Code of conduct attestation",
				owner: "T. Walsh",
				status: "compliant",
				dueDate: "2026-07-20",
				lastTested: "2026-07-09",
			},
			{
				id: "ADM-202",
				title: "Delegation of authority matrix",
				owner: "N. Singh",
				status: "in_progress",
				dueDate: "2026-07-25",
			},
			{
				id: "ADM-203",
				title: "Records retention schedule",
				owner: "K. Davis",
				status: "at_risk",
				dueDate: "2026-07-16",
			},
		],
	},
	it: {
		domain: "it",
		label: "IT access controls",
		kpis: [
			{
				id: "reviews",
				title: "Access reviews due",
				value: "9",
				description: "This month",
				trend: "-2",
				trendDirection: "down",
			},
			{
				id: "failed",
				title: "Failed logins",
				value: "42",
				description: "Last 30 days",
				trend: "+8",
				trendDirection: "up",
			},
			{
				id: "privileged",
				title: "Privileged accounts",
				value: "18",
				description: "Under monitoring",
				trend: "0",
				trendDirection: "neutral",
			},
			{
				id: "sod",
				title: "SoD violations",
				value: "2",
				description: "Segregation issues",
				trend: "-1",
				trendDirection: "down",
			},
		],
		timeSeries: series(
			["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
			[88, 90, 91, 92, 93, 94, 95, 96, 97, 98],
			[58, 52, 48, 45, 44, 43, 42, 40, 41, 42],
		),
		breakdown: [
			{ name: "Admin", value: 6, fill: "#0f5384" },
			{ name: "Finance", value: 5, fill: "#03AFBF" },
			{ name: "Clinical", value: 4, fill: "#56B8FF" },
			{ name: "Contractors", value: 3, fill: "#1E40AF" },
		],
		donut: [
			{ name: "Approved", value: 82, fill: "#03AFBF" },
			{ name: "Pending review", value: 12, fill: "#F59E0B" },
			{ name: "Revoked", value: 6, fill: "#EF4444" },
		],
		evidence: [
			{
				id: "IT-301",
				title: "Quarterly privileged access review",
				owner: "D. Nguyen",
				status: "in_progress",
				dueDate: "2026-07-19",
			},
			{
				id: "IT-302",
				title: "MFA enforcement check",
				owner: "P. Lewis",
				status: "compliant",
				dueDate: "2026-07-11",
				lastTested: "2026-07-11",
			},
			{
				id: "IT-303",
				title: "Terminated user access sweep",
				owner: "D. Nguyen",
				status: "at_risk",
				dueDate: "2026-07-13",
			},
		],
	},
	vendor: {
		domain: "vendor",
		label: "Vendor / RFP lifecycle",
		kpis: [
			{
				id: "rfp",
				title: "Active RFPs",
				value: "4",
				description: "In flight",
				trend: "+1",
				trendDirection: "up",
			},
			{
				id: "eval",
				title: "In evaluation",
				value: "7",
				description: "Vendor proposals",
				trend: "+2",
				trendDirection: "up",
			},
			{
				id: "awarded",
				title: "Contracts awarded",
				value: "12",
				description: "YTD",
				trend: "+3",
				trendDirection: "up",
			},
			{
				id: "overdue",
				title: "Overdue milestones",
				value: "3",
				description: "Needs attention",
				trend: "-1",
				trendDirection: "down",
			},
		],
		timeSeries: series(
			["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
			[2, 3, 2, 4, 3, 5, 4, 4, 5, 4],
			[45, 42, 40, 38, 36, 34, 32, 30, 28, 26],
		),
		breakdown: [
			{ name: "Draft", value: 2, fill: "#524E4E" },
			{ name: "Published", value: 4, fill: "#56B8FF" },
			{ name: "Evaluation", value: 7, fill: "#0f5384" },
			{ name: "Awarded", value: 12, fill: "#03AFBF" },
			{ name: "Active", value: 28, fill: "#1E40AF" },
		],
		donut: [
			{ name: "Low risk", value: 52, fill: "#03AFBF" },
			{ name: "Medium risk", value: 32, fill: "#F59E0B" },
			{ name: "High risk", value: 16, fill: "#EF4444" },
		],
		evidence: [
			{
				id: "RFP-401",
				title: "EHR platform RFP",
				owner: "C. Rivera",
				status: "in_progress",
				dueDate: "2026-08-01",
				category: "Evaluation",
			},
			{
				id: "RFP-402",
				title: "Facilities maintenance vendor",
				owner: "B. Hall",
				status: "pending",
				dueDate: "2026-07-28",
				category: "Published",
			},
			{
				id: "RFP-403",
				title: "Cloud backup services",
				owner: "E. Foster",
				status: "at_risk",
				dueDate: "2026-07-12",
				category: "Draft",
			},
		],
	},
};

export function getAuditDomainData(
	domain: AuditDomainData["domain"],
): AuditDomainData {
	return auditDomainMockData[domain];
}

export function getTimeSeriesForPeriod(
	domain: AuditDomainData["domain"],
	period: AuditPeriod,
) {
	return auditDomainMockData[domain].timeSeries[period];
}
