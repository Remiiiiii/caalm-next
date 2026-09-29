"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ITNavIcon } from "@/components/sidebar/ITNavIcon";
import { isNavItemActive } from "@/components/sidebar/sidebar-icons";
import {
	filterITNavigationByPermissions,
	IT_NAVIGATION,
	type ITSidebarSection,
	WORKSPACE_ICON_BY_NAME,
} from "@/constants/it-navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRoles } from "@/hooks/useUserRoles";
import { resolveAccessibleDashboardLinks } from "@/lib/navigation/dashboard-links";
import { useITUser } from "@/hooks/useITUser";
import { cn } from "@/lib/utils";

type ITNavMobileSheetProps = {
	pathname: string | null;
	onNavigate?: () => void;
};

export function ITNavMobileSheet({
	pathname,
	onNavigate,
}: ITNavMobileSheetProps) {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { roles: userRoles } = useUserRoles();
	const { user } = useITUser();

	const workspaceLinks = useMemo(() => {
		const roleNames = userRoles
			.map((r) => r.roleName)
			.filter((n): n is string => Boolean(n));
		const profile = {
			department: user?.department,
			departmentLabel: user?.department,
		};
		return resolveAccessibleDashboardLinks(
			permissions,
			roleNames,
			profile,
		).filter((link) => link.url !== "/dashboard/it");
	}, [permissions, userRoles, user?.department]);

	const filteredNav = useMemo(() => {
		if (permissionsLoading) return [];
		const base = filterITNavigationByPermissions(IT_NAVIGATION, permissions);
		if (workspaceLinks.length === 0) return base;
		const workspaces: ITSidebarSection = {
			header: "Workspaces",
			icon: "layoutDashboard",
			items: workspaceLinks.map((link) => ({
				name: link.name,
				icon: WORKSPACE_ICON_BY_NAME[link.name] || "layoutDashboard",
				url: link.url,
			})),
		};
		return [workspaces, ...base];
	}, [permissions, permissionsLoading, workspaceLinks]);

	if (permissionsLoading) {
		return (
			<div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
				<span className="text-sm">Loading navigation...</span>
			</div>
		);
	}

	return (
		<ul className="mobile-nav-list">
			{filteredNav.map((section) =>
				section.items.length === 0 ? null : (
					<li key={section.header}>
						<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
							{section.header}
						</p>
						<ul className="mb-4 flex flex-col gap-1 px-1">
							{section.items.map((item, index) => {
								const active =
									item.url === "/tickets"
										? pathname === "/tickets" ||
											(!!pathname?.startsWith("/tickets/") &&
												!pathname.startsWith("/tickets/new"))
										: isNavItemActive(pathname, item.url, "/dashboard/it");
								return (
									<li
										key={`${section.header}-${item.name}-${index}`}
										className={cn("mobile-nav-item", active && "shad-active")}
									>
										<Link
											href={item.url}
											className="flex w-full items-center gap-3"
											onClick={() => onNavigate?.()}
										>
											<ITNavIcon
												name={item.icon}
												size={20}
												className={cn(
													active ? "text-white" : "text-slate-500",
												)}
											/>
											<span
												className={cn(
													"truncate text-[15px] font-medium",
													active ? "text-white" : "text-slate-700",
												)}
											>
												{item.name}
											</span>
										</Link>
									</li>
								);
							})}
						</ul>
					</li>
				),
			)}
		</ul>
	);
}
