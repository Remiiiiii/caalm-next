"use client";

import { Building, Building2, Cloud, Crown, Eye, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, memo, useEffect } from "react";
import ITSidebar from "@/components/ITSidebar";
import StorageUsageBar from "@/components/StorageUsageBar";
import { NavItemIcon } from "@/components/sidebar/NavItemIcon";
import { SectionNavIcon } from "@/components/sidebar/SectionNavIcon";
import SidebarCollapsedRail from "@/components/sidebar/SidebarCollapsedRail";
import SidebarCollapseToggle from "@/components/sidebar/SidebarCollapseToggle";
import {
	DASHBOARD_ITEM_COLORS,
	ITEM_ICONS,
	isNavItemActive,
} from "@/components/sidebar/sidebar-icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebarCollapse } from "@/contexts/SidebarContext";
import { useAnalyticsPrefetch } from "@/hooks/useAnalyticsPrefetch";
import { useGroupedNavigation } from "@/hooks/useGroupedNavigation";
import { sectionTourId } from "@/lib/demo/tour/sectionTourId";
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
			shouldShowLock,
		} = useGroupedNavigation();

		useEffect(() => {
			const criticalIcons = [
				"/assets/icons/calendar2.svg",
				"/assets/icons/contracts.svg",
				"/assets/icons/settings.svg",
			];

			criticalIcons.forEach((icon) => {
				const link = document.createElement("link");
				link.rel = "preload";
				link.as = "image";
				link.href = icon;
				document.head.appendChild(link);
			});
		}, []);

		if (isITUser) {
			return <ITSidebar name={name} avatar={avatar} email={email} />;
		}

		const collapsedSections = groupedNav
			.filter((section) => section.items.length > 0)
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
						<SidebarCollapsedRail
							sections={collapsedSections}
							isViewer={isViewer}
							shouldShowLock={shouldShowLock}
							rootException="/analytics"
						/>
					)
				) : (
					<>
						<nav className="sidebar-nav">
							<ul className="flex flex-1 flex-col">
								{groupedNav.length === 0 &&
								permissionsLoading &&
								rolesLoading ? (
									<li className="text-center py-8 text-muted-foreground">
										<div className="flex flex-col items-center gap-2">
											<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
											<span className="text-sm">Loading navigation...</span>
										</div>
									</li>
								) : groupedNav.length === 0 ? (
									<li className="text-center py-8 text-muted-foreground">
										No navigation items available
									</li>
								) : (
									groupedNav.map((section) => {
										if (section.items.length === 0) return null;

										return (
											<div key={section.header} className="mb-3">
												<li
													className="sidebar-section-header mb-0 lg:mb-1"
													data-tour={sectionTourId(section.header)}
												>
													<span className="flex items-center gap-2">
														{section.header === "Dashboard" ? (
															<span className="flex items-center gap-2">
																<SectionNavIcon header="Dashboard" priority />
																{primaryRole && (
																	<TooltipProvider>
																		<Tooltip>
																			<TooltipTrigger asChild>
																				<span className="sr-only">
																					{primaryRole}
																				</span>
																			</TooltipTrigger>
																			<TooltipContent>
																				<p>
																					You have {permissions.length}{" "}
																					permissions as {primaryRole}. View
																					details →
																				</p>
																			</TooltipContent>
																		</Tooltip>
																	</TooltipProvider>
																)}
															</span>
														) : (
															<SectionNavIcon
																header={section.header}
																priority={section.header === "Calendar"}
															/>
														)}
														<span className="font-semibold text-sm sidebar-gradient-text relative z-10">
															{section.header}
														</span>
													</span>
												</li>
												<div className="relative ml-3">
													<ul className="flex flex-col gap-1 relative z-10">
														{section.items.map((item, index) => (
															<Fragment
																key={`${section.header}-${item.name}-${
																	item.url || index
																}`}
															>
																<li className="relative flex items-center">
																	{index < section.items.length + 1 && (
																		<span
																			className="absolute left-0 top-0 h-6 w-4 border-l border-[#BFBFBF]"
																			style={{ zIndex: 0 }}
																		/>
																	)}
																	<span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl" />
																	<Link
																		href={item.url || ""}
																		className={cn(
																			"ml-4 w-full flex items-center gap-1 rounded-md px-1.5 py-1 cursor-pointer transition-all duration-200",
																			"hover:bg-blue-50 hover:border-blue-300 border border-transparent",
																			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
																			isNavItemActive(
																				pathname,
																				item.url,
																				"/analytics",
																			) && "bg-blue/10 border-blue/20",
																			isViewer &&
																				item.viewerReadOnly &&
																				"opacity-75",
																		)}
																		onMouseEnter={() => {
																			if (item.url?.includes("/analytics")) {
																				router.prefetch(item.url);
																				const departmentMatch =
																					item.url.match(
																						/\/analytics\/([^/]+)/,
																					);
																				if (departmentMatch) {
																					prefetchDepartmentAnalytics(
																						departmentMatch[1],
																					);
																				}
																			}
																		}}
																	>
																		{section.header === "Dashboard" && (
																			<span>
																				{item.name === "Super Admin" && (
																					<Crown className="h-4 w-4 text-yellow-500" />
																				)}
																				{item.name === "Organization Admin" && (
																					<Building2 className="h-4 w-4 text-blue-500" />
																				)}
																				{item.name === "Department Manager" && (
																					<Building className="h-4 w-4 text-green-500" />
																				)}
																				{item.name === "Viewer" && (
																					<Eye className="h-4 w-4 text-gray-500" />
																				)}
																			</span>
																		)}
																		{(() => {
																			const iconConfig = ITEM_ICONS[item.name];
																			if (
																				!iconConfig &&
																				item.name !== "Documents"
																			) {
																				return null;
																			}
																			const isPriority = index < 3;
																			return (
																				<span>
																					<NavItemIcon
																						name={item.name}
																						width={iconConfig?.width ?? 20}
																						height={iconConfig?.height ?? 20}
																						priority={isPriority}
																					/>
																				</span>
																			);
																		})()}
																		<p
																			className={cn(
																				"text-xs text-slate-900 px-2 font-medium flex items-center gap-2",
																				item.name === "Admin" && "-ml-px",
																			)}
																		>
																			<span
																				style={{
																					color:
																						ITEM_ICONS[item.name]?.color ??
																						DASHBOARD_ITEM_COLORS[item.name],
																				}}
																			>
																				{item.name}
																			</span>
																			{shouldShowLock(item) && (
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger asChild>
																							<span className="flex items-center">
																								<Lock className="h-3 w-3 text-gray-500" />
																							</span>
																						</TooltipTrigger>
																						<TooltipContent>
																							<p>
																								This feature requires{" "}
																								{item.permissions
																									.map((p) =>
																										p.split(".").pop(),
																									)
																									.join(" or ")}{" "}
																								permission. Contact your
																								administrator to request access.
																							</p>
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			)}
																			{isViewer && item.viewerReadOnly && (
																				<TooltipProvider>
																					<Tooltip>
																						<TooltipTrigger asChild>
																							<span className="flex items-center text-[10px] text-gray-500">
																								(read-only)
																							</span>
																						</TooltipTrigger>
																						<TooltipContent>
																							<p>
																								You have read-only access as an
																								External Auditor. You cannot
																								modify this data.
																							</p>
																						</TooltipContent>
																					</Tooltip>
																				</TooltipProvider>
																			)}
																		</p>
																	</Link>
																</li>
															</Fragment>
														))}
													</ul>
												</div>
											</div>
										);
									})
								)}
							</ul>
						</nav>

						{!groupedNav.some((s) => s.header === "Settings") && (
							<Link href="/settings" className="cursor-pointer">
								<div className="flex items-center gap-2 mt-6">
									<SectionNavIcon header="Settings" priority />
									<span className="font-semibold text-sm sidebar-gradient-text">
										Settings
									</span>
								</div>
							</Link>
						)}

						<div className="sidebar-storage-info">
							<div className="w-full">
								<div className="flex items-center gap-2 mb-2">
									<Cloud className="h-4 w-4 text-slate-700" />
									<p className="caption text-slate-700">Storage</p>
								</div>
								<StorageUsageBar />
							</div>
						</div>
					</>
				)}
			</aside>
		);
	},
);

Sidebar.displayName = "Sidebar";

export default Sidebar;
