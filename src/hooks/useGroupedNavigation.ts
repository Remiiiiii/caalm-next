"use client";

import { useMemo } from "react";
import {
	hasNavigationPermission,
	type NavigationItem,
	PERMISSION_BASED_NAV,
} from "@/constants/navigation-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
	canAccessITPortal,
	resolveAccessibleDashboardLinks,
} from "@/lib/navigation/dashboard-links";

export function useGroupedNavigation() {
	const { user } = useAuth();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { roles: userRoles, loading: rolesLoading } = useUserRoles();

	const departmentProfile = useMemo(
		() => ({
			department: (user as { department?: string } | null)?.department,
			departmentLabel: (user as { departmentLabel?: string } | null)
				?.departmentLabel,
		}),
		[user],
	);

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

	const canUseITPortal = useMemo(
		() => canAccessITPortal(permissions, departmentProfile),
		[permissions, departmentProfile],
	);

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

		const roleNames = userRoles
			.map((r) => r.roleName)
			.filter((name): name is string => Boolean(name));

		let dashboardItems = resolveAccessibleDashboardLinks(
			permissions,
			roleNames,
			departmentProfile,
		).map((link) => ({
			name: link.name,
			icon: "/assets/icons/dashboard.svg",
			url: link.url,
			permissions: link.permissions,
		}));

		if (dashboardItems.length === 0 && !rolesLoading) {
			const fallbackDashboardItems =
				PERMISSION_BASED_NAV.find((s) => s.header === "Dashboard")?.items || [];
			const accessibleDashboards = fallbackDashboardItems.filter((item) =>
				hasNavigationPermission(permissions, item),
			);
			dashboardItems = accessibleDashboards.map((item) => ({
				name: item.name,
				icon: item.icon,
				url: item.url,
				permissions: item.permissions,
			}));
		}

		if (dashboardItems.length > 0) {
			nav.push({
				header: "Dashboard",
				items: dashboardItems,
			});
		}

		const filterAccessible = (items: NavigationItem[]): NavigationItem[] => {
			return items.filter((item) => hasNavigationPermission(permissions, item));
		};

		const sectionHeaders = [
			"Calendar",
			"Contracts",
			"Licenses",
			"Audits",
			"Files",
			"Team",
			"Reports & Analytics",
			"My Roles & Permissions",
			"Settings",
		] as const;

		for (const header of sectionHeaders) {
			const sectionItems =
				PERMISSION_BASED_NAV.find((s) => s.header === header)?.items || [];
			const accessible = filterAccessible(sectionItems);

			if (accessible.length > 0) {
				nav.push({ header, items: accessible });
			}
		}

		return nav;
	}, [
		permissions,
		permissionsLoading,
		userRoles,
		rolesLoading,
		departmentProfile,
	]);

	return {
		groupedNav,
		permissions,
		permissionsLoading,
		rolesLoading,
		primaryRole,
		isViewer,
		isITUser,
		canUseITPortal,
		shouldShowLock,
	};
}
