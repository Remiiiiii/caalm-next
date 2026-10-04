/**
 * Honest inventory of analytics / dashboard chart surfaces.
 * `live` = org-scoped API queries. `sample` = illustrative only.
 * `mixed` = live KPIs plus illustrative charts (must show a notice).
 */
export type AnalyticsWidgetSource = "live" | "sample" | "mixed";

export type AnalyticsWidgetInventoryEntry = {
	id: string;
	title: string;
	component: string;
	source: AnalyticsWidgetSource;
	/** Not mounted in customer navigation today */
	unused?: boolean;
	notes?: string;
};

export const ANALYTICS_WIDGET_INVENTORY: AnalyticsWidgetInventoryEntry[] = [
	{
		id: "analytics-unified-stat-cards",
		title: "Analytics hero stat cards",
		component: "AnalyticsPage / AnalyticsStatCard",
		source: "live",
		notes: "Fed by /api/analytics/unified (permission + org scoped)",
	},
	{
		id: "organization-analytics",
		title: "Organization analytics",
		component: "OrganizationAnalyticsDashboard",
		source: "live",
		notes: "/api/analytics/organization",
	},
	{
		id: "portfolio-accountability",
		title: "Portfolio accountability",
		component: "PortfolioAccountabilityDashboard",
		source: "live",
		notes: "/api/analytics/portfolio-accountability",
	},
	{
		id: "calendar-analytics",
		title: "Calendar analytics",
		component: "CalendarAnalyticsDashboard",
		source: "live",
		notes: "/api/analytics/calendar",
	},
	{
		id: "analytics-compliance-tab",
		title: "Compliance & audit tab",
		component: "AnalyticsComplianceTab",
		source: "mixed",
		notes: "Live contracts/licenses; illustrative regulatory KRIs with banner",
	},
	{
		id: "audit-domain-tabs",
		title: "Audit compliance domain tabs",
		component: "AuditDomainTabContent",
		source: "mixed",
		notes: "mergeDomainWithLiveData + illustrative time series when mock on",
	},
	{
		id: "audit-readiness-hero",
		title: "Audit readiness hero",
		component: "AuditReadinessHero",
		source: "live",
		notes: "/api/analytics/audit-readiness",
	},
	{
		id: "executive-dashboard",
		title: "Executive dashboard",
		component: "ExecutiveDashboard",
		source: "live",
		notes: "useUnifiedDashboardData + portfolio accountability",
	},
	{
		id: "enhanced-analytics-dashboard",
		title: "Enhanced analytics dashboard (unused)",
		component: "EnhancedAnalyticsDashboard",
		source: "sample",
		unused: true,
		notes: "Hard-coded mock; not imported by customer routes",
	},
];
