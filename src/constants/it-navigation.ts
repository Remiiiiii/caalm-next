/**
 * IT Dashboard Navigation Configuration
 * Icons use Lucide keys resolved in ITSidebar (many /assets/icons/*.svg paths do not exist).
 */

import type { PermissionKey } from "./permissions";
import { PERMISSIONS } from "./permissions";

export type ITNavIconKey =
	| "layoutDashboard"
	| "server"
	| "monitor"
	| "hardDrive"
	| "activity"
	| "barChart3"
	| "shield"
	| "heartPulse"
	| "gauge"
	| "triangleAlert"
	| "network"
	| "appWindow"
	| "gitBranch"
	| "hammer"
	| "rocket"
	| "tag"
	| "badgeCheck"
	| "gitFork"
	| "map"
	| "ticket"
	| "searchCode"
	| "bookOpen"
	| "keyRound"
	| "scrollText"
	| "clipboardCheck"
	| "lock"
	| "map"
	| "siren"
	| "database"
	| "tableProperties"
	| "search"
	| "fileText"
	| "info"
	| "circleAlert"
	| "history"
	| "calendarClock"
	| "bookMarked"
	| "users"
	| "userCog"
	| "building2"
	| "trendingUp"
	| "settings"
	| "plug"
	| "bell"
	| "databaseBackup"
	| "clock"
	| "crown"
	| "building"
	| "eye"
	| "newspaper"
	| "circlePlus"
	| "inbox";

export interface ITSidebarItem {
	name: string;
	icon: ITNavIconKey;
	url: string;
	permission?: PermissionKey;
	subItems?: ITSidebarItem[];
}

export interface ITSidebarSection {
	header: string;
	/** Section header icon (falls back to first item icon) */
	icon?: ITNavIconKey;
	items: ITSidebarItem[];
}

/**
 * IT portal nav — grouped by job, not by every microservice name.
 */
export const IT_NAVIGATION: ITSidebarSection[] = [
	{
		header: "Overview",
		icon: "layoutDashboard",
		items: [
			{
				name: "Dashboard",
				icon: "layoutDashboard",
				url: "/dashboard/it",
			},
			{
				name: "System overview",
				icon: "monitor",
				url: "/dashboard/it/system-overview",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
			{
				name: "Storage",
				icon: "hardDrive",
				url: "/dashboard/it/storage",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
		],
	},
	{
		header: "Support",
		icon: "ticket",
		items: [
			{
				name: "Report issue",
				icon: "circlePlus",
				url: "/tickets/new",
				permission: PERMISSIONS.TICKETS.CREATE,
			},
			{
				name: "Tickets",
				icon: "inbox",
				url: "/tickets",
				permission: PERMISSIONS.TICKETS.VIEW,
			},
			{
				name: "Issue History",
				icon: "history",
				url: "/dashboard/it/issuehistory",
				permission: PERMISSIONS.TICKETS.VIEW,
			},
		],
	},
	{
		header: "Monitoring",
		icon: "activity",
		items: [
			{
				name: "System health",
				icon: "heartPulse",
				url: "/dashboard/it/monitoring/system-health",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
			{
				name: "Performance",
				icon: "gauge",
				url: "/dashboard/it/monitoring/performance",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
			{
				name: "Error logs",
				icon: "triangleAlert",
				url: "/dashboard/it/monitoring/errors",
				permission: PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
			},
			{
				name: "Infrastructure",
				icon: "server",
				url: "/dashboard/it/monitoring/infrastructure",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
			{
				name: "Network",
				icon: "network",
				url: "/dashboard/it/monitoring/network",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
			{
				name: "Applications",
				icon: "appWindow",
				url: "/dashboard/it/monitoring/application",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
			{
				name: "API analytics",
				icon: "barChart3",
				url: "/dashboard/it/monitoring/api-analytics",
				permission: PERMISSIONS.IT.VIEW_ANALYTICS,
			},
			{
				name: "Rate limits",
				icon: "shield",
				url: "/dashboard/it/rate-limits",
				permission: PERMISSIONS.IT.VIEW_RATE_LIMITS,
			},
		],
	},
	{
		header: "Incidents",
		icon: "siren",
		items: [
			{
				name: "Active incidents",
				icon: "circleAlert",
				url: "/dashboard/it/incidents/active",
				permission: PERMISSIONS.IT.VIEW_INCIDENTS,
			},
			{
				name: "History",
				icon: "history",
				url: "/dashboard/it/incidents/history",
				permission: PERMISSIONS.IT.VIEW_INCIDENTS,
			},
			{
				name: "On-call",
				icon: "calendarClock",
				url: "/dashboard/it/incidents/on-call",
				permission: PERMISSIONS.IT.VIEW_INCIDENTS,
			},
			{
				name: "Post-mortems",
				icon: "fileText",
				url: "/dashboard/it/incidents/post-mortems",
				permission: PERMISSIONS.IT.VIEW_INCIDENTS,
			},
			{
				name: "Runbooks",
				icon: "bookMarked",
				url: "/dashboard/it/incidents/runbooks",
				permission: PERMISSIONS.IT.VIEW_RUNBOOKS,
			},
		],
	},
	{
		header: "CI/CD",
		icon: "rocket",
		items: [
			{
				name: "Pipelines",
				icon: "gitBranch",
				url: "/dashboard/it/cicd/pipelines",
				permission: PERMISSIONS.IT.MANAGE_CI_CD,
			},
			{
				name: "Builds",
				icon: "hammer",
				url: "/dashboard/it/cicd/builds",
				permission: PERMISSIONS.IT.MANAGE_CI_CD,
			},
			{
				name: "Deployments",
				icon: "rocket",
				url: "/dashboard/it/cicd/deployments",
				permission: PERMISSIONS.IT.MANAGE_DEPLOYMENTS,
			},
			{
				name: "Releases",
				icon: "tag",
				url: "/dashboard/it/cicd/releases",
				permission: PERMISSIONS.IT.MANAGE_DEPLOYMENTS,
			},
			{
				name: "Code quality",
				icon: "badgeCheck",
				url: "/dashboard/it/cicd/quality",
				permission: PERMISSIONS.IT.MANAGE_CI_CD,
			},
		],
	},
	{
		header: "Development",
		icon: "gitFork",
		items: [
			{
				name: "Repositories",
				icon: "gitFork",
				url: "/dashboard/it/development/repositories",
				permission: PERMISSIONS.IT.MANAGE_CI_CD,
			},
			{
				name: "Issues",
				icon: "ticket",
				url: "/dashboard/it/development/issues",
				permission: PERMISSIONS.IT.MANAGE_CI_CD,
			},
			{
				name: "Code analysis",
				icon: "searchCode",
				url: "/dashboard/it/development/code-analysis",
				permission: PERMISSIONS.IT.MANAGE_CI_CD,
			},
			{
				name: "CLM Roadmap",
				icon: "map",
				url: "/dashboard/it/development/clm-roadmap",
				permission: PERMISSIONS.IT.VIEW_ROADMAP,
			},
			{
				name: "Job scheduler",
				icon: "clock",
				url: "/dashboard/it/automation/jobs",
				permission: PERMISSIONS.IT.MANAGE_CI_CD,
			},
		],
	},
	{
		header: "Data & logs",
		icon: "database",
		items: [
			{
				name: "DB performance",
				icon: "database",
				url: "/dashboard/it/database/performance",
				permission: PERMISSIONS.IT.MANAGE_DATABASE,
			},
			{
				name: "DB health",
				icon: "activity",
				url: "/dashboard/it/database/health",
				permission: PERMISSIONS.IT.MANAGE_DATABASE,
			},
			{
				name: "Schema",
				icon: "tableProperties",
				url: "/dashboard/it/database/schema",
				permission: PERMISSIONS.IT.MANAGE_DATABASE,
			},
			{
				name: "Query analytics",
				icon: "search",
				url: "/dashboard/it/database/queries",
				permission: PERMISSIONS.IT.MANAGE_DATABASE,
			},
			{
				name: "Log aggregation",
				icon: "scrollText",
				url: "/dashboard/it/logs/aggregation",
				permission: PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
			},
			{
				name: "Log analysis",
				icon: "fileText",
				url: "/dashboard/it/logs/analysis",
				permission: PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
			},
			{
				name: "Traces",
				icon: "activity",
				url: "/dashboard/it/logs/traces",
				permission: PERMISSIONS.IT.VIEW_MONITORING,
			},
		],
	},
	{
		header: "Security",
		icon: "shield",
		items: [
			{
				name: "Security dashboard",
				icon: "shield",
				url: "/dashboard/it/security/dashboard",
				permission: PERMISSIONS.IT.VIEW_SECURITY,
			},
			{
				name: "Audit logs",
				icon: "scrollText",
				url: "/dashboard/it/security/audit-logs",
				permission: PERMISSIONS.AUDIT.VIEW,
			},
			{
				name: "Compliance",
				icon: "clipboardCheck",
				url: "/dashboard/it/security/compliance",
				permission: PERMISSIONS.IT.VIEW_SECURITY,
			},
			{
				name: "Access control",
				icon: "lock",
				url: "/dashboard/it/security/access-control",
				permission: PERMISSIONS.IT.VIEW_SECURITY,
			},
			{
				name: "Incident response",
				icon: "siren",
				url: "/dashboard/it/security/incident-response",
				permission: PERMISSIONS.IT.VIEW_INCIDENTS,
			},
		],
	},
	{
		header: "API",
		icon: "keyRound",
		items: [
			{
				name: "Documentation",
				icon: "bookOpen",
				url: "/dashboard/it/api/documentation",
				permission: PERMISSIONS.IT.MANAGE_API_KEYS,
			},
			{
				name: "Usage",
				icon: "barChart3",
				url: "/dashboard/it/api/usage",
				permission: PERMISSIONS.IT.VIEW_ANALYTICS,
			},
			{
				name: "Gateway",
				icon: "server",
				url: "/dashboard/it/api/gateway",
				permission: PERMISSIONS.IT.MANAGE_API_KEYS,
			},
		],
	},
	{
		header: "Team",
		icon: "users",
		items: [
			{
				name: "IT directory",
				icon: "users",
				url: "/dashboard/it/team/directory",
				permission: PERMISSIONS.USERS.VIEW,
			},
			{
				name: "Roles",
				icon: "userCog",
				url: "/dashboard/it/team/roles",
				permission: PERMISSIONS.USERS.ASSIGN_ROLES,
			},
			{
				name: "Departments",
				icon: "building2",
				url: "/dashboard/it/team/departments",
				permission: PERMISSIONS.USERS.VIEW,
			},
			{
				name: "Team performance",
				icon: "trendingUp",
				url: "/dashboard/it/team/performance",
				permission: PERMISSIONS.USERS.VIEW,
			},
		],
	},
	{
		header: "Settings",
		icon: "settings",
		items: [
			{
				name: "System",
				icon: "settings",
				url: "/dashboard/it/settings/system",
				permission: PERMISSIONS.SETTINGS.VIEW,
			},
			{
				name: "Integrations",
				icon: "plug",
				url: "/dashboard/it/settings/integrations",
				permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
			},
			{
				name: "Notifications",
				icon: "bell",
				url: "/dashboard/it/settings/notifications",
				permission: PERMISSIONS.SETTINGS.VIEW,
			},
			{
				name: "Backup",
				icon: "databaseBackup",
				url: "/dashboard/it/settings/backup",
				permission: PERMISSIONS.IT.MANAGE_DATABASE,
			},
		],
	},
];

/**
 * Keep the IT sidebar on these pages, not only under /dashboard/it.
 * Tickets live at /tickets (queue, new, detail) but are IT Support nav items.
 */
export function isITSidebarPath(pathname: string | null | undefined): boolean {
	if (!pathname) return false;
	if (pathname === "/dashboard/it" || pathname.startsWith("/dashboard/it/")) {
		return true;
	}
	if (pathname === "/incident" || pathname.startsWith("/incident/")) {
		return true;
	}
	return pathname === "/tickets" || pathname.startsWith("/tickets/");
}

/** Lucide keys for workspace switcher labels */
export const WORKSPACE_ICON_BY_NAME: Record<string, ITNavIconKey> = {
	"Super Admin": "crown",
	"Organization Admin": "building2",
	"Department Manager": "building",
	Viewer: "eye",
	IT: "server",
	"Content Creator": "newspaper",
};

/**
 * Filter navigation items based on user permissions
 */
export function filterITNavigationByPermissions(
	navigation: ITSidebarSection[],
	userPermissions: PermissionKey[],
): ITSidebarSection[] {
	return navigation
		.map((section) => ({
			...section,
			items: section.items
				.filter((item) => {
					if (!item.permission) return true;
					return userPermissions.includes(item.permission);
				})
				.map((item) => {
					if (!item.subItems) return item;
					return {
						...item,
						subItems: item.subItems.filter((subItem) => {
							if (!subItem.permission) return true;
							return userPermissions.includes(subItem.permission);
						}),
					};
				}),
		}))
		.filter((section) => section.items.length > 0);
}
