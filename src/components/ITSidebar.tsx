/**
 * IT Sidebar Component
 * Specialized sidebar for IT/Software Engineering staff
 */

"use client";

import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { Fragment, useMemo } from "react";
import { ITNavIcon } from "@/components/sidebar/ITNavIcon";
import SidebarCollapsedRail from "@/components/sidebar/SidebarCollapsedRail";
import SidebarCollapseToggle from "@/components/sidebar/SidebarCollapseToggle";
import { isNavItemActive } from "@/components/sidebar/sidebar-icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	filterITNavigationByPermissions,
	IT_NAVIGATION,
	type ITNavIconKey,
	type ITSidebarSection,
	WORKSPACE_ICON_BY_NAME,
} from "@/constants/it-navigation";
import { useSidebarCollapse } from "@/contexts/SidebarContext";
import { useITUser } from "@/hooks/useITUser";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRoles } from "@/hooks/useUserRoles";
import { resolveAccessibleDashboardLinks } from "@/lib/navigation/dashboard-links";
import {
	type ConnectionStatus,
	realtimeService,
} from "@/lib/services/realtime-service";
import { cn } from "@/lib/utils";

interface ITSidebarProps {
	name?: string;
	email: string;
}

function sectionIconKey(section: ITSidebarSection): ITNavIconKey {
	return section.icon || section.items[0]?.icon || "layoutDashboard";
}

const ITSidebar: React.FC<ITSidebarProps> = ({ name, email }) => {
	const pathname = usePathname();
	const { isCollapsed } = useSidebarCollapse();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { roles: userRoles } = useUserRoles();
	const { user, loading: userLoading } = useITUser();
	const [realtimeStatus, setRealtimeStatus] = React.useState<ConnectionStatus>(
		realtimeService.getConnectionStatus(),
	);

	React.useEffect(() => {
		const unsubscribe = realtimeService.onStatusChange((status) => {
			setRealtimeStatus(status);
		});
		setRealtimeStatus(realtimeService.getConnectionStatus());
		return unsubscribe;
	}, []);

	const workspaceLinks = useMemo(() => {
		const roleNames = userRoles
			.map((r) => r.roleName)
			.filter((n): n is string => Boolean(n));
		// useITUser already merges departmentLabel into `department`
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

	const collapsedSections = useMemo(
		() =>
			filteredNav
				.filter((section) => section.items.length > 0)
				.map((section) => ({
					header: section.header,
					iconNode: (
						<ITNavIcon
							name={sectionIconKey(section)}
							size={20}
							className="text-[#03AFBF]"
						/>
					),
					items: section.items.map((item) => ({
						name: item.name,
						url: item.url,
						iconKey: item.icon,
					})),
				})),
		[filteredNav],
	);

	const getConnectionIndicator = () => {
		switch (realtimeStatus) {
			case "connected":
				return (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 text-green-600">
									<Wifi className="h-3 w-3" />
									{!isCollapsed && <span className="text-xs">Connected</span>}
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Real-time sync active</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				);
			case "connecting":
				return (
					<div className="flex items-center gap-1 text-yellow-600">
						<Wifi className="h-3 w-3 animate-pulse" />
						{!isCollapsed && <span className="text-xs">Connecting...</span>}
					</div>
				);
			case "error":
				return (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1 text-red-600">
									<AlertCircle className="h-3 w-3" />
									{!isCollapsed && <span className="text-xs">Error</span>}
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Real-time sync error. Reconnecting...</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				);
			default:
				return (
					<div className="flex items-center gap-1 text-gray-400">
						<WifiOff className="h-3 w-3" />
						{!isCollapsed && <span className="text-xs">Disconnected</span>}
					</div>
				);
		}
	};

	return (
		<aside
			className={cn("sidebar", isCollapsed && "sidebar-collapsed")}
			data-collapsed={isCollapsed ? "true" : "false"}
		>
			<div
				className={cn(
					"flex items-center mb-4",
					isCollapsed ? "flex-col gap-2" : "justify-between",
				)}
			>
				<Link href="/dashboard/it" className="inline-flex shrink-0">
					<Image
						src="/assets/images/logo.svg"
						alt="logo"
						width={isCollapsed ? 32 : 42}
						height={isCollapsed ? 32 : 42}
						className={cn(
							"shrink-0 object-contain",
							isCollapsed ? "h-8 w-8" : "h-9 w-9",
						)}
						priority
						fetchPriority="high"
					/>
				</Link>
				<SidebarCollapseToggle compact={isCollapsed} />
			</div>

			{!isCollapsed && (
				<div className="mb-6 p-3 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-slate-200">
					{userLoading ? (
						<div className="space-y-2">
							<div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
							<div className="h-3 w-40 bg-slate-200 animate-pulse rounded" />
						</div>
					) : user ? (
						<div className="space-y-2">
							<div className="min-w-0">
								<p className="text-sm font-semibold text-slate-700 truncate">
									{name || user.fullName || "User"}
								</p>
								<p className="text-xs text-slate-500 truncate">{email}</p>
							</div>
							<div className="pt-2 border-t border-slate-200 space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-xs text-slate-600">Role:</span>
									<span className="text-xs font-semibold text-[#0f5384]">
										{user.roleName}
									</span>
								</div>
								{user.department && (
									<div className="flex items-center justify-between">
										<span className="text-xs text-slate-600">Department:</span>
										<span className="text-xs font-medium text-slate-700">
											{user.department}
										</span>
									</div>
								)}
							</div>
							<div className="pt-2 border-t border-slate-200">
								{getConnectionIndicator()}
							</div>
						</div>
					) : null}
				</div>
			)}

			{isCollapsed ? (
				<>
					<div className="mb-2 flex justify-center">
						{getConnectionIndicator()}
					</div>
					{permissionsLoading ? (
						<div className="flex flex-1 items-center justify-center py-8">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
						</div>
					) : (
						<SidebarCollapsedRail
							sections={collapsedSections}
							rootException="/dashboard/it"
						/>
					)}
				</>
			) : (
				<nav className="sidebar-nav">
					<ul className="flex flex-1 flex-col gap-1">
						{permissionsLoading ? (
							<li className="text-center py-8 text-muted-foreground">
								<div className="flex flex-col items-center gap-2">
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
									<span className="text-sm">Loading navigation...</span>
								</div>
							</li>
						) : filteredNav.length === 0 ? (
							<li className="text-center py-8 text-muted-foreground">
								No navigation items available
							</li>
						) : (
							filteredNav.map((section) => {
								if (section.items.length === 0) return null;
								const headerIcon = sectionIconKey(section);

								return (
									<Fragment key={section.header}>
										{section.header === "Settings" && (
											<li aria-hidden className="my-3 list-none px-1">
												<div
													className="border-t border-slate-200/80"
													role="separator"
												/>
											</li>
										)}
										<div className="mb-3">
										<li className="sidebar-section-header mb-0 lg:mb-1">
											<span className="flex items-center gap-2">
												<span className="text-[#03AFBF]">
													<ITNavIcon name={headerIcon} size={20} />
												</span>
												<span className="font-semibold text-sm sidebar-gradient-text relative z-10">
													{section.header}
												</span>
											</span>
										</li>
										<div className="relative ml-3">
											<ul className="flex flex-col gap-1 relative z-10">
												{section.items.map((item, index) => {
													const isActive =
														item.url === "/tickets"
															? pathname === "/tickets" ||
																(!!pathname?.startsWith("/tickets/") &&
																	!pathname.startsWith("/tickets/new"))
															: isNavItemActive(
																	pathname,
																	item.url,
																	"/dashboard/it",
																);

													return (
														<li
															key={`${section.header}-${item.name}-${index}`}
															className="relative flex items-center"
														>
															{index < section.items.length + 1 && (
																<span
																	className="absolute left-0 top-0 h-6 w-4 border-l border-[#BFBFBF]"
																	style={{ zIndex: 0 }}
																/>
															)}
															<span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl" />
															<Link
																href={item.url}
																className={cn(
																	"ml-4 w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 cursor-pointer transition-all duration-200",
																	"hover:bg-blue-50 hover:border-blue-300 border border-transparent",
																	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
																	isActive && "bg-blue/10 border-blue/20",
																)}
															>
																<ITNavIcon
																	name={item.icon}
																	size={16}
																	className={cn(
																		"text-slate-500",
																		isActive && "text-[#0f5384]",
																	)}
																/>
																<p
																	className={cn(
																		"text-xs text-slate-700 font-medium truncate",
																		isActive && "text-[#0f5384] font-semibold",
																	)}
																>
																	{item.name}
																</p>
															</Link>
														</li>
													);
												})}
											</ul>
										</div>
										</div>
									</Fragment>
								);
							})
						)}
					</ul>
				</nav>
			)}
		</aside>
	);
};

export default ITSidebar;
