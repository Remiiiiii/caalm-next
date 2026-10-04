/**
 * IT routes that still render ITPlaceholderPage ("Coming online").
 * Primary IT nav hides these; deep links stay for internal QA.
 *
 * Keep in sync when a placeholder page is replaced with a real surface.
 */
export const IT_PLACEHOLDER_ROUTES = [
	"/dashboard/it/api/documentation",
	"/dashboard/it/api/gateway",
	"/dashboard/it/api/usage",
	"/dashboard/it/automation/jobs",
	"/dashboard/it/cicd/builds",
	"/dashboard/it/cicd/deployments",
	"/dashboard/it/cicd/pipelines",
	"/dashboard/it/cicd/quality",
	"/dashboard/it/cicd/releases",
	"/dashboard/it/database/health",
	"/dashboard/it/database/performance",
	"/dashboard/it/database/queries",
	"/dashboard/it/development/code-analysis",
	"/dashboard/it/development/issues",
	"/dashboard/it/development/repositories",
	"/dashboard/it/incidents/history",
	"/dashboard/it/incidents/on-call",
	"/dashboard/it/incidents/post-mortems",
	"/dashboard/it/logs/aggregation",
	"/dashboard/it/logs/analysis",
	"/dashboard/it/logs/traces",
	"/dashboard/it/monitoring/application",
	"/dashboard/it/monitoring/errors",
	"/dashboard/it/monitoring/infrastructure",
	"/dashboard/it/monitoring/network",
	"/dashboard/it/monitoring/performance",
	"/dashboard/it/security/dashboard",
	"/dashboard/it/settings/backup",
	"/dashboard/it/team/departments",
	"/dashboard/it/team/performance",
] as const;

export const IT_PLACEHOLDER_ROUTE_COUNT = IT_PLACEHOLDER_ROUTES.length;

const PLACEHOLDER_SET = new Set<string>(IT_PLACEHOLDER_ROUTES);

/** True when this nav URL is still an ITPlaceholderPage shell. */
export function isITPlaceholderNavUrl(url: string): boolean {
	const path = url.split("?")[0]?.replace(/\/$/, "") || url;
	return PLACEHOLDER_SET.has(path);
}
