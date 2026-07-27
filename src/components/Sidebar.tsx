"use client";

import { Building, Building2, Cloud, Crown, Eye, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, memo, useEffect, useState } from "react";
import ITSidebar from "@/components/ITSidebar";
import StorageProgressBar from "@/components/StorageProgressBar";
import SidebarCollapsedRail from "@/components/sidebar/SidebarCollapsedRail";
import SidebarCollapseToggle from "@/components/sidebar/SidebarCollapseToggle";
import {
	DASHBOARD_ITEM_COLORS,
	ITEM_ICONS,
	isNavItemActive,
	SECTION_ICONS,
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
import { cn } from "@/lib/utils";

interface TotalSpace {
	document: { size: number; latestDate: string };
	image: { size: number; latestDate: string };
	video: { size: number; latestDate: string };
	audio: { size: number; latestDate: string };
	other: { size: number; latestDate: string };
	used: number;
	all: number;
}

interface Props {
	name?: string;
	avatar?: string;
	email: string;
	role?: string;
	division?: string;
}

const SidebarIcon = memo(
	({
		src,
		alt,
		width,
		height,
		priority = false,
	}: {
		src: string;
		alt: string;
		width: number;
		height: number;
		priority?: boolean;
	}) => (
		<Image
			src={src}
			alt={alt}
			width={width}
			height={height}
			priority={priority}
			fetchPriority={priority ? "high" : "auto"}
			loading={priority ? undefined : "lazy"}
			className="shrink-0 max-w-none"
			style={{ width: "auto", height: `${height}px` }}
		/>
	),
);
SidebarIcon.displayName = "SidebarIcon";

const Sidebar = memo(
	({ name, avatar, email, role: _role, division: _division }: Props) => {
		const [totalSpace, setTotalSpace] = useState<TotalSpace | null>(null);
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
			async function fetchTotalSpace() {
				try {
					const response = await fetch("/api/storage/usage");
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					const space = await response.json();
					setTotalSpace(space);
				} catch (error) {
					console.error("Failed to fetch total space:", error);
					setTotalSpace({
						document: { size: 0, latestDate: "" },
						image: { size: 0, latestDate: "" },
						video: { size: 0, latestDate: "" },
						audio: { size: 0, latestDate: "" },
						other: { size: 0, latestDate: "" },
						used: 0,
						all: 2 * 1024 * 1024 * 1024,
					});
				}
			}
			fetchTotalSpace();
			const interval = setInterval(fetchTotalSpace, 30000);
			return () => clearInterval(interval);
		}, []);

		useEffect(() => {
			const criticalIcons = [
				"/assets/icons/calendar2.svg",
				"/assets/icons/contracts.svg",
				"/assets/icons/documents.svg",
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
												<li className="sidebar-section-header mb-0 lg:mb-1">
													<span className="flex items-center gap-2">
														{section.header === "Dashboard" ? (
															<span className="flex items-center gap-2">
																<span className="text-[#03AFBF]">
																	<svg
																		width="22"
																		height="22"
																		viewBox="0 0 26 26"
																		fill="none"
																		xmlns="http://www.w3.org/2000/svg"
																		aria-hidden
																	>
																		<path
																			d="M10.5167 2.16602H3.74582C2.87467 2.16602 2.16602 2.87467 2.16602 3.74582V7.80832C2.16602 8.67964 2.87467 9.38829 3.74582 9.38829H10.5167C11.388 9.38829 12.0966 8.67964 12.0966 7.80832V3.74582C12.0966 2.87467 11.388 2.16602 10.5167 2.16602ZM10.5167 11.1937H3.74582C2.87467 11.1937 2.16602 11.9024 2.16602 12.7737V22.2529C2.16602 23.124 2.87467 23.8327 3.74582 23.8327H10.5167C11.388 23.8327 12.0966 23.124 12.0966 22.2529V12.7737C12.0966 11.9024 11.388 11.1937 10.5167 11.1937ZM22.2529 16.6104H15.482C14.6107 16.6104 13.9021 17.3191 13.9021 18.1904V22.2529C13.9021 23.124 14.6107 23.8327 15.482 23.8327H22.2529C23.124 23.8327 23.8327 23.124 23.8327 22.2529V18.1904C23.8327 17.3191 23.124 16.6104 22.2529 16.6104ZM22.2529 2.16602H15.482C14.6107 2.16602 13.9021 2.87467 13.9021 3.74582V13.225C13.9021 14.0963 14.6107 14.805 15.482 14.805H22.2529C23.124 14.805 23.8327 14.0963 23.8327 13.225V3.74582C23.8327 2.87467 23.124 2.16602 22.2529 2.16602Z"
																			fill="currentColor"
																		/>
																	</svg>
																</span>
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
															(() => {
																const iconConfig =
																	SECTION_ICONS[section.header];
																if (!iconConfig) return null;
																return (
																	<span className="text-[#03AFBF]">
																		<SidebarIcon
																			src={iconConfig.src}
																			alt={section.header.toLowerCase()}
																			width={Math.min(iconConfig.width, 22)}
																			height={Math.min(iconConfig.height, 22)}
																			priority={
																				section.header === "Dashboard" ||
																				section.header === "Calendar"
																			}
																		/>
																	</span>
																);
															})()
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
																			if (!iconConfig) return null;
																			const isPriority = index < 3;
																			return (
																				<span>
																					<SidebarIcon
																						src={iconConfig.src}
																						alt={item.name.toLowerCase()}
																						width={iconConfig.width}
																						height={iconConfig.height}
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
									<SidebarIcon
										src="/assets/icons/settings.svg"
										alt="settings"
										width={22}
										height={22}
										priority
									/>
									<span className="font-semibold text-sm sidebar-gradient-text">
										Settings
									</span>
								</div>
							</Link>
						)}

						<div className="sidebar-storage-info">
							{totalSpace && (
								<div className="w-full">
									<div className="flex items-center gap-2 mb-2">
										<Cloud className="h-4 w-4 text-slate-700" />
										<p className="caption text-slate-700">Storage</p>
									</div>
									<StorageProgressBar totalSpace={totalSpace} />
								</div>
							)}
						</div>
					</>
				)}
			</aside>
		);
	},
);

Sidebar.displayName = "Sidebar";

export default Sidebar;
