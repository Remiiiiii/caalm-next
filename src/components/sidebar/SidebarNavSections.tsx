"use client";

import { Building, Building2, Crown, Eye, Lock, Server } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { MobileDashboardRoleSwitcher } from "@/components/mobile/MobileDashboardRoleSwitcher";
import { NavItemIcon } from "@/components/sidebar/NavItemIcon";
import { SectionNavIcon } from "@/components/sidebar/SectionNavIcon";
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
import type { NavigationItem } from "@/constants/navigation-permissions";
import { sectionTourId } from "@/lib/demo/tour/sectionTourId";
import { DASHBOARD_SWITCH_LINKS } from "@/lib/navigation/dashboard-links";
import { cn } from "@/lib/utils";

const DASHBOARD_SWITCHER_NAMES = new Set(
	DASHBOARD_SWITCH_LINKS.map((link) => link.name),
);

export type NavSection = {
	header: string;
	items: NavigationItem[];
};

type SidebarNavSectionsProps = {
	variant?: "sidebar" | "mobile";
	groupedNav: NavSection[];
	pathname: string | null;
	permissionsLoading: boolean;
	rolesLoading: boolean;
	permissions: { length: number };
	primaryRole: string | null;
	isViewer: boolean;
	shouldShowLock: (item: NavigationItem) => boolean;
	onNavigate?: () => void;
	onPrefetchAnalytics?: (departmentSlug: string) => void;
};

function NavItemLabels({
	item,
	isViewer,
	shouldShowLock,
	active,
	mobile,
}: {
	item: NavigationItem;
	isViewer: boolean;
	shouldShowLock: (item: NavigationItem) => boolean;
	active: boolean;
	mobile: boolean;
}) {
	return (
		<span
			className={cn(
				"flex min-w-0 flex-1 items-center gap-2 font-medium",
				mobile
					? cn("truncate text-[15px]", active ? "text-white" : "text-slate-700")
					: "text-xs text-slate-700 px-2",
				item.name === "Admin" && !mobile && "-ml-px",
			)}
		>
			<span
				style={
					mobile
						? { color: "inherit" }
						: {
								color:
									ITEM_ICONS[item.name]?.color ??
									DASHBOARD_ITEM_COLORS[item.name],
							}
				}
				className={cn(mobile && active && "text-white")}
			>
				{item.name}
			</span>
			{shouldShowLock(item) && (
				<Lock
					className={cn(
						"h-3 w-3 shrink-0",
						mobile && active ? "text-white/90" : "text-gray-500",
					)}
					aria-hidden
				/>
			)}
			{isViewer && item.viewerReadOnly ? (
				<span
					className={cn(
						"shrink-0 text-xs",
						mobile && active ? "text-white/80" : "text-gray-500",
					)}
				>
					(read-only)
				</span>
			) : null}
		</span>
	);
}

function NavItemIcons({
	sectionHeader,
	item,
	mobile,
	active,
}: {
	sectionHeader: string;
	item: NavigationItem;
	mobile: boolean;
	active: boolean;
}) {
	const iconSize = mobile ? 22 : 20;
	return (
		<>
			{sectionHeader === "Dashboard" && (
				<span className="shrink-0">
					{item.name === "Super Admin" && (
						<Crown
							className={cn(
								"h-5 w-5",
								mobile && active ? "text-white" : "text-yellow-500",
							)}
						/>
					)}
					{item.name === "Organization Admin" && (
						<Building2
							className={cn(
								"h-5 w-5",
								mobile && active ? "text-white" : "text-blue-500",
							)}
						/>
					)}
					{item.name === "Department Manager" && (
						<Building
							className={cn(
								"h-5 w-5",
								mobile && active ? "text-white" : "text-green-500",
							)}
						/>
					)}
					{item.name === "Viewer" && (
						<Eye
							className={cn(
								"h-5 w-5",
								mobile && active ? "text-white" : "text-gray-500",
							)}
						/>
					)}
					{item.name === "IT" && (
						<Server
							className={cn(
								"h-5 w-5",
								mobile && active ? "text-white" : "text-[#0f5384]",
							)}
						/>
					)}
				</span>
			)}
			{(() => {
				const iconConfig = ITEM_ICONS[item.name];
				if (!iconConfig && item.name !== "Documents") {
					return null;
				}
				return (
					<span
						className={cn(
							"shrink-0",
							mobile && active && "[&_img]:brightness-0 [&_img]:invert",
						)}
					>
						<NavItemIcon
							name={item.name}
							width={iconConfig?.width ?? iconSize}
							height={iconConfig?.height ?? iconSize}
							priority
						/>
					</span>
				);
			})()}
		</>
	);
}

export function SidebarNavSections({
	variant = "sidebar",
	groupedNav,
	pathname,
	permissionsLoading,
	rolesLoading,
	permissions,
	primaryRole,
	isViewer,
	shouldShowLock,
	onNavigate,
	onPrefetchAnalytics,
}: SidebarNavSectionsProps) {
	const mobile = variant === "mobile";

	if (groupedNav.length === 0 && permissionsLoading && rolesLoading) {
		return (
			<div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
				<span className="text-sm">Loading navigation...</span>
			</div>
		);
	}

	if (groupedNav.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				No navigation items available
			</p>
		);
	}

	const mobileDashboardSwitcherItems = mobile
		? (groupedNav.find((s) => s.header === "Dashboard")?.items ?? []).filter(
				(item) => DASHBOARD_SWITCHER_NAMES.has(item.name),
			)
		: [];

	const sections = groupedNav.map((section) => {
		if (section.items.length === 0) return null;
		if (section.header === "Settings") return null;

		const sectionItems =
			mobile && section.header === "Dashboard"
				? section.items.filter(
						(item) => !DASHBOARD_SWITCHER_NAMES.has(item.name),
					)
				: section.items;

		if (mobile && sectionItems.length === 0) return null;

		if (mobile) {
			return (
				<li key={section.header}>
					<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
						{section.header}
					</p>
					<ul className="mb-4 flex flex-col gap-1 px-1">
						{sectionItems.map((item, index) => {
							const active = item.url
								? isNavItemActive(pathname, item.url, "/analytics")
								: false;
							return (
								<li
									key={`${section.header}-${item.name}-${item.url || index}`}
									className={cn("mobile-nav-item", active && "shad-active")}
								>
									<Link
										href={item.url || ""}
										className="flex w-full items-center gap-3"
										onClick={() => onNavigate?.()}
									>
										<NavItemIcons
											sectionHeader={section.header}
											item={item}
											mobile
											active={active}
										/>
										<NavItemLabels
											item={item}
											isViewer={isViewer}
											shouldShowLock={shouldShowLock}
											active={active}
											mobile
										/>
									</Link>
								</li>
							);
						})}
					</ul>
				</li>
			);
		}

		return (
			<Fragment key={section.header}>
				<div className="mb-3">
					<li
						className="sidebar-section-header mb-0 lg:mb-1 list-none"
						data-tour={sectionTourId(section.header)}
					>
						<span className="flex items-center gap-2">
							{section.header === "Dashboard" ? (
								<span className="flex items-center gap-2">
									<SectionNavIcon header="Dashboard" priority />
									{primaryRole ? (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="sr-only">{primaryRole}</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>
														You have {permissions.length} permissions as{" "}
														{primaryRole}. View details →
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									) : null}
								</span>
							) : (
								<SectionNavIcon
									header={section.header}
									priority={section.header === "Calendar"}
								/>
							)}
							<span className="relative z-10 text-sm font-semibold sidebar-gradient-text">
								{section.header}
							</span>
						</span>
					</li>
					<div className="relative ml-3">
						<ul className="relative z-10 flex flex-col gap-1">
							{section.items.map((item, index) => {
								const active = item.url
									? isNavItemActive(pathname, item.url, "/analytics")
									: false;

								return (
									<Fragment
										key={`${section.header}-${item.name}-${item.url || index}`}
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
													"ml-4 flex w-full cursor-pointer items-center gap-1 rounded-md border border-transparent px-1.5 py-1 transition-all duration-200",
													"hover:border-blue-300 hover:bg-blue-50",
													"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
													active && "border-blue/20 bg-blue/10",
													isViewer && item.viewerReadOnly && "opacity-75",
												)}
												onMouseEnter={() => {
													if (item.url?.includes("/analytics")) {
														const departmentMatch =
															item.url.match(/\/analytics\/([^/]+)/);
														if (departmentMatch && onPrefetchAnalytics) {
															onPrefetchAnalytics(departmentMatch[1]);
														}
													}
												}}
											>
												<NavItemIcons
													sectionHeader={section.header}
													item={item}
													mobile={false}
													active={active}
												/>
												<p
													className={cn(
														"flex items-center gap-2 px-2 text-xs font-medium text-slate-700",
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
																			.map((p) => p.split(".").pop())
																			.join(" or ")}{" "}
																		permission. Contact your administrator to
																		request access.
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
																		You have read-only access as an External
																		Auditor. You cannot modify this data.
																	</p>
																</TooltipContent>
															</Tooltip>
														</TooltipProvider>
													)}
												</p>
											</Link>
										</li>
									</Fragment>
								);
							})}
						</ul>
					</div>
				</div>
			</Fragment>
		);
	});

	if (mobile) {
		return (
			<>
				<MobileDashboardRoleSwitcher
					items={mobileDashboardSwitcherItems}
					onNavigate={onNavigate}
				/>
				<ul className="mobile-nav-list">{sections}</ul>
			</>
		);
	}

	return <div className="flex w-full flex-col">{sections}</div>;
}
