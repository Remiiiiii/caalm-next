"use client";

import { useMemo } from "react";
import {
	hasNavigationPermission,
	type NavigationItem,
	PERMISSION_BASED_NAV,
} from "@/constants/navigation-permissions";
import type { PermissionKey } from "@/constants/permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRoles } from "@/hooks/useUserRoles";

const ROLE_TO_DASHBOARD_MAP: Record<
	string,
	{ url: string; permissions: PermissionKey[] }
> = {
	"Super Admin": {
		url: "/dashboard/superadmin",
		permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
	},
	"Organization Admin": {
		url: "/dashboard/organizationadmin",
		permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
	},
	"Department Manager": {
		url: "/dashboard/departmentmanager",
		permissions: [
			PERMISSIONS.CALENDAR.VIEW_TEAM,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.REVIEW,
			PERMISSIONS.CONTRACTS.APPROVE,
		],
	},
	Viewer: {
		url: "/dashboard/viewer",
		permissions: [PERMISSIONS.CALENDAR.VIEW_OWN, PERMISSIONS.CONTRACTS.VIEW],
	},
	IT: {
		url: "/dashboard/it",
		permissions: [PERMISSIONS.IT.VIEW_MONITORING],
	},
	"Content Creator": {
		url: "/dashboard/content-creator",
		permissions: [
			PERMISSIONS.NEWS.READ,
			PERMISSIONS.NEWS.CREATE,
			PERMISSIONS.NEWS.UPDATE,
		],
	},
};

export function useGroupedNavigation() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { roles: userRoles, loading: rolesLoading } = useUserRoles();

	const { isViewer, primaryRole, isITUser } = useMemo(() => {
		if (userRoles.length === 0) {
			return { isViewer: false, primaryRole: null, isITUser: false };
		}
		const viewerRole = userRoles.find((r) => r.roleName === "Viewer");
		const itRole = userRoles.find((r) => r.roleName === "IT");
		return {
			isViewer: !!viewerRole,
			primaryRole: userRoles[0]?.roleName || null,
			isITUser: !!itRole,
		};
	}, [userRoles]);

	const shouldShowLock = useMemo(
		() =>
			(item: NavigationItem): boolean => {
				if (!item.requiresElevated) return false;
				return !hasNavigationPermission(permissions, item);
			},
		[permissions],
	);

	const groupedNav = useMemo(() => {
		const hasData = permissions.length > 0 || userRoles.length > 0;
		const isInitialLoad = permissionsLoading && rolesLoading && !hasData;

		if (isInitialLoad) {
			return [];
		}

		const nav: typeof PERMISSION_BASED_NAV = [];

		const dashboardItems: Array<{
			name: string;
			icon: string;
			url: string;
			permissions: PermissionKey[];
		}> = [];

		const seenUrls = new Set<string>();
		userRoles.forEach((userRole) => {
			if (userRole.roleName) {
				const dashboardConfig = ROLE_TO_DASHBOARD_MAP[userRole.roleName];
				if (dashboardConfig && !seenUrls.has(dashboardConfig.url)) {
					const hasAccess = dashboardConfig.permissions.some((perm) =>
						permissions.includes(perm),
					);

					if (hasAccess) {
						seenUrls.add(dashboardConfig.url);
						dashboardItems.push({
							name: userRole.roleName,
							icon: "/assets/icons/dashboard.svg",
							url: dashboardConfig.url,
							permissions: dashboardConfig.permissions,
						});
					}
				}
			}
		});

		if (dashboardItems.length === 0 && !rolesLoading) {
			const fallbackDashboardItems =
				PERMISSION_BASED_NAV.find((s) => s.header === "Dashboard")?.items || [];
			const accessibleDashboards = fallbackDashboardItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			);

			accessibleDashboards.forEach((item) => {
				if (!seenUrls.has(item.url)) {
					seenUrls.add(item.url);
					dashboardItems.push(item);
				}
			});
		}

		if (dashboardItems.length > 0) {
			nav.push({
				header: "Dashboard",
				items: dashboardItems,
			});
		}

		const filterItemsByRole = (items: NavigationItem[]): NavigationItem[] => {
			return items.filter((item) => {
				if (item.hiddenForRoles && primaryRole) {
					if (item.hiddenForRoles.includes(primaryRole)) {
						return false;
					}
				}
				return true;
			});
		};

		const sectionHeaders = [
			"Calendar",
			"Contracts",
			"Licenses",
			"Documents",
			"Audits",
			"Team",
			"Reports & Analytics",
			"Settings",
			"My Roles & Permissions",
		] as const;

		for (const header of sectionHeaders) {
			const sectionItems =
				PERMISSION_BASED_NAV.find((s) => s.header === header)?.items || [];
			const accessible = filterItemsByRole(
				sectionItems.filter((item) =>
					hasNavigationPermission(permissions, item),
				),
			);

			if (accessible.length > 0) {
				nav.push({ header, items: accessible });
			}
		}

		return nav;
	}, [permissions, permissionsLoading, userRoles, rolesLoading, primaryRole]);

	return {
		groupedNav,
		permissions,
		permissionsLoading,
		rolesLoading,
		primaryRole,
		isViewer,
		isITUser,
		shouldShowLock,
	};
}
