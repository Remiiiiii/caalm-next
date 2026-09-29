"use client";

import { Cloud } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useEffect } from "react";
import ITSidebar from "@/components/ITSidebar";
import StorageUsageBar from "@/components/StorageUsageBar";
import { SidebarNavSections } from "@/components/sidebar/SidebarNavSections";
import SidebarCollapsedRail from "@/components/sidebar/SidebarCollapsedRail";
import SidebarCollapseToggle from "@/components/sidebar/SidebarCollapseToggle";
import SidebarUserCard from "@/components/sidebar/SidebarUserCard";
import { isITSidebarPath } from "@/constants/it-navigation";
import { useSidebarCollapse } from "@/contexts/SidebarContext";
import { useAnalyticsPrefetch } from "@/hooks/useAnalyticsPrefetch";
import { useGroupedNavigation } from "@/hooks/useGroupedNavigation";
import { cn } from "@/lib/utils";

interface Props {
	name?: string;
	avatar?: string;
	email: string;
	role?: string;
	division?: string;
}

const Sidebar = memo(
	({ name, avatar, email, role: _role, division: _division }: Props) => {
		const router = useRouter();
		const pathname = usePathname();
		const { prefetchDepartmentAnalytics } = useAnalyticsPrefetch();
		const { isCollapsed } = useSidebarCollapse();
		const {
			groupedNav,
			permissions,
			permissionsLoading,
			rolesLoading,
			primaryRole,
			isViewer,
			isITUser,
			canUseITPortal,
			shouldShowLock,
		} = useGroupedNavigation();

		useEffect(() => {
			const criticalIcons = [
				"/assets/icons/calendar2.svg",
				"/assets/icons/contracts.svg",
				"/assets/icons/settings.svg",
				"/assets/icons/queue.svg",
				"/assets/icons/development.svg",
				"/assets/icons/resources.svg",
				"/assets/icons/create-contract.png",
				"/assets/icons/documents.svg",
			];

			criticalIcons.forEach((icon) => {
				const link = document.createElement("link");
				link.rel = "preload";
				link.as = "image";
				link.href = icon;
				document.head.appendChild(link);
			});
		}, []);

		// IT chrome for portal users on IT pages (incl. /tickets) or the IT role
		const showITSidebar =
			canUseITPortal && (isITSidebarPath(pathname) || isITUser);

		if (showITSidebar) {
			return <ITSidebar name={name} email={email} />;
		}

		const settingsItems =
			groupedNav.find((section) => section.header === "Settings")?.items ?? [];

		const collapsedSections = groupedNav
			.filter(
				(section) => section.items.length > 0 && section.header !== "Settings",
			)
			.map((section) => ({
				header: section.header,
				items: section.items.map((item) => ({
					name: item.name,
					url: item.url,
					icon: item.icon,
					permissions: item.permissions,
					viewerReadOnly: item.viewerReadOnly,
				})),
			}));

		const isSuperAdminDashboard = pathname?.startsWith("/dashboard/superadmin");

		return (
			<aside
				className={cn(
					"sidebar",
					isCollapsed && "sidebar-collapsed",
					isSuperAdminDashboard && "sidebar-solid-panel",
				)}
				data-collapsed={isCollapsed ? "true" : "false"}
			>
				<div
					className={cn(
						"flex items-center mb-4",
						isCollapsed ? "flex-col gap-2" : "justify-between",
					)}
				>
					<Link
						href="/"
						className={cn(
							"flex items-center gap-2 min-w-0",
							isCollapsed && "justify-center",
						)}
					>
						<span
							className={cn(
								"dashboard-logo",
								isCollapsed && "dashboard-logo-collapsed",
							)}
						>
							<Image
								src="/assets/images/logo.svg"
								alt="CAALM"
								fill
								className="object-contain"
								sizes="32px"
								priority
								fetchPriority="high"
							/>
						</span>
						{!isCollapsed ? (
							<span className="text-lg font-bold sidebar-gradient-text truncate">
								CAALM
							</span>
						) : null}
					</Link>

					<SidebarCollapseToggle compact={isCollapsed} />
				</div>

				{isCollapsed ? (
					permissionsLoading && rolesLoading && groupedNav.length === 0 ? (
						<div className="flex flex-1 items-center justify-center py-8">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
						</div>
					) : (
						<>
							<SidebarCollapsedRail
								sections={collapsedSections}
								isViewer={isViewer}
								shouldShowLock={shouldShowLock}
								rootException="/analytics"
							/>
							<SidebarUserCard
								compact
								name={name}
								email={email}
								settingsItems={settingsItems}
							/>
						</>
					)
				) : (
					<>
						<nav className="sidebar-nav">
							<ul className="flex flex-1 flex-col">
								<SidebarNavSections
									variant="sidebar"
									groupedNav={groupedNav}
									pathname={pathname}
									permissionsLoading={permissionsLoading}
									rolesLoading={rolesLoading}
									permissions={permissions}
									primaryRole={primaryRole}
									isViewer={isViewer}
									shouldShowLock={shouldShowLock}
									onPrefetchAnalytics={(slug) => {
										const url = `/analytics/${slug}`;
										router.prefetch(url);
										prefetchDepartmentAnalytics(slug);
									}}
								/>
							</ul>
						</nav>

						<div className="sidebar-footer">
							<div
								aria-hidden
								className="mx-1 border-t border-slate-300/80"
								role="separator"
							/>

							<div className="sidebar-storage-info">
								<div className="w-full">
									<div className="mb-1 flex items-center gap-2">
										<Cloud className="h-3.5 w-3.5 text-slate-700" />
										<p className="caption text-slate-700">Storage</p>
									</div>
									<StorageUsageBar />
								</div>
							</div>

							<div
								aria-hidden
								className="mx-1 mt-2 border-t border-slate-300/80"
								role="separator"
							/>

							<SidebarUserCard
								name={name}
								email={email}
								settingsItems={settingsItems}
							/>
						</div>
					</>
				)}
			</aside>
		);
	},
);

Sidebar.displayName = "Sidebar";

export default Sidebar;
