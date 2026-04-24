/**
 * Fallback dashboard routing when `roles.priority` / `roles.homeDashboardPath`
 * are not set in Appwrite. Keys are stable role row `$id`s.
 * Lower `priority` = higher precedence for home dashboard resolution.
 */
export const ROLE_DASHBOARD_FALLBACK: Record<
	string,
	{ priority: number; homeDashboardPath: string }
> = {
	role_super_admin: {
		priority: 10,
		homeDashboardPath: "/dashboard/superadmin",
	},
	role_it_staff: {
		priority: 20,
		homeDashboardPath: "/dashboard/it",
	},
	role_org_admin: {
		priority: 30,
		homeDashboardPath: "/dashboard/organizationadmin",
	},
	role_content_creator: {
		priority: 40,
		homeDashboardPath: "/dashboard/content-creator",
	},
	role_dept_manager: {
		priority: 50,
		homeDashboardPath: "/dashboard/departmentmanager",
	},
	role_viewer: {
		priority: 60,
		homeDashboardPath: "/dashboard/viewer",
	},
};
